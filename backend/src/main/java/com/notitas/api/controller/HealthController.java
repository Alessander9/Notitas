package com.notitas.api.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoint público de salud. Render (plan gratis) lo usa como health check
 * para saber cuándo el contenedor está listo; también evita que el servicio
 * se marque como unhealthy con un 404 en la raíz.
 */
@RestController
public class HealthController {

    @GetMapping("/api/public/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
