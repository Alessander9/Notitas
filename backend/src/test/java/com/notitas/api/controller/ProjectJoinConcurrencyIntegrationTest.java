package com.notitas.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regresión del bug de la carrera en {@code project_members}: dos peticiones de
 * join concurrentes con el mismo token podían pasar el check "no es miembro" a
 * la vez e insertar el miembro duplicado (rompía {@code findByProjectIdAndUserId}
 * → 500 en GET /api/projects) o devolver 500 al perdedor de la carrera.
 *
 * Necesita el servidor HTTP real (RANDOM_PORT): la carrera requiere
 * transacciones reales e independientes, que MockMvc + {@code @Transactional}
 * no pueden simular.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ProjectJoinConcurrencyIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    private HttpEntity<String> authed(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(headers);
    }

    private HttpEntity<Map<String, Object>> json(Object body, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) headers.setBearerAuth(token);
        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) body;
        return new HttpEntity<>(map, headers);
    }

    private String registerAndLogin(String email) {
        ResponseEntity<JsonNode> registered = rest.postForEntity("/api/auth/register",
                json(Map.of("name", "Race", "email", email, "password", "secret123"), null), JsonNode.class);
        assertThat(registered.getStatusCode().value()).isEqualTo(200);
        ResponseEntity<JsonNode> login = rest.postForEntity("/api/auth/login",
                json(Map.of("email", email, "password", "secret123"), null), JsonNode.class);
        assertThat(login.getStatusCode().value()).isEqualTo(200);
        return login.getBody().get("token").asText();
    }

    @Test
    void concurrentJoins_neverReturn500NorDuplicateMembers() throws Exception {
        for (int i = 0; i < 4; i++) {
            String owner = registerAndLogin("race.owner." + i + "@test.com");
            String guest = registerAndLogin("race.guest." + i + "@test.com");

            ResponseEntity<JsonNode> created = rest.postForEntity("/api/projects",
                    json(Map.of("name", "Raza " + i), owner), JsonNode.class);
            long projectId = created.getBody().get("id").asLong();
            ResponseEntity<JsonNode> invite = rest.postForEntity("/api/projects/" + projectId + "/invite-token",
                    authed(owner), JsonNode.class);
            String inviteToken = invite.getBody().get("inviteToken").asText();

            // Dos joins del MISMO invitado lanzados a la vez
            ExecutorService pool = Executors.newFixedThreadPool(2);
            CountDownLatch start = new CountDownLatch(1);
            Callable<Integer> join = () -> {
                start.await();
                ResponseEntity<String> r = rest.postForEntity(
                        "/api/projects/join/" + inviteToken, authed(guest), String.class);
                return r.getStatusCode().value();
            };
            Future<Integer> f1 = pool.submit(join);
            Future<Integer> f2 = pool.submit(join);
            start.countDown();
            int s1 = f1.get(30, TimeUnit.SECONDS);
            int s2 = f2.get(30, TimeUnit.SECONDS);
            pool.shutdown();

            // Ni el ganador ni el perdedor de la carrera pueden recibir 500
            assertThat(s1).as("iteración %d: 1er join", i).isEqualTo(200);
            assertThat(s2).as("iteración %d: 2º join", i).isEqualTo(200);

            // El invitado lee su lista de proyectos: sin 500 y con UN solo miembro
            ResponseEntity<JsonNode> projects = rest.exchange("/api/projects",
                    HttpMethod.GET, authed(guest), JsonNode.class);
            assertThat(projects.getStatusCode().value())
                    .as("iteración %d: GET /api/projects del invitado", i).isEqualTo(200);
            JsonNode target = null;
            for (JsonNode p : projects.getBody()) {
                if (p.get("id").asLong() == projectId) {
                    target = p;
                    break;
                }
            }
            assertThat(target).as("iteración %d: el invitado ve el proyecto", i).isNotNull();
            assertThat(target.get("collaborators")).as("iteración %d: sin miembros duplicados", i).hasSize(1);
        }
    }
}
