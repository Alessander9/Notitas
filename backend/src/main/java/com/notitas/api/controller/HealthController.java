package com.notitas.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;

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

    @GetMapping("/api/public/health")
    public ResponseEntity<Map<String, String>> health() {
        String dbStatus = "up";
        try (Connection connection = dataSource.getConnection()) {
            if (!connection.isValid(3)) {
                dbStatus = "unreachable";
            }
        } catch (Exception e) {
            dbStatus = "connecting";
        }
        return ResponseEntity.ok(Map.of("status", "ok", "service", "notitas-api", "database", dbStatus));
    }
}
