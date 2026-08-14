package com.notitas.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Map;
import java.time.Instant;

/**
 * Endpoint público de salud. Render (plan gratis) lo usa como health check
 * para saber cuándo el contenedor está listo; también evita que el servicio
 * se marque como unhealthy con un 404 en la raíz.
 *
 * Además de responder 200, valida que la base de datos responde: si la BD
 * está caída, devuelve 503 y Render marca el contenedor como unhealthy y lo
 * reinicia, permitiendo auto-recuperación en vez de dejar la app con errores
 * silenciosos hasta que alguien lo arregle a mano.
 */
@RestController
public class HealthController {

    private final DataSource dataSource;

    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Liveness check ligero para Render y monitores externos. No toca la base
     * de datos: su único propósito es mantener el proceso despierto y saber si
     * Spring Boot acepta peticiones.
     */
    @RequestMapping(value = "/api/public/ping", method = {RequestMethod.GET, RequestMethod.HEAD})
    public ResponseEntity<Map<String, String>> ping() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "service", "notitas-api",
                "timestamp", Instant.now().toString()
        ));
    }

    @RequestMapping(value = "/api/public/health", method = {RequestMethod.GET, RequestMethod.HEAD})
    public ResponseEntity<Map<String, String>> health() {
        try (Connection connection = dataSource.getConnection()) {
            if (!connection.isValid(3)) {
                return ResponseEntity.status(503).body(Map.of(
                        "status", "degraded",
                        "service", "notitas-api",
                        "database", "unreachable"
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of(
                    "status", "degraded",
                    "service", "notitas-api",
                    "database", "unreachable"
            ));
        }
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "service", "notitas-api",
                "database", "up"
        ));
    }
}
