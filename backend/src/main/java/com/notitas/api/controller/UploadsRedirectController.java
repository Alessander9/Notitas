package com.notitas.api.controller;

import com.notitas.api.service.SupabaseStorageService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.servlet.view.RedirectView;

/**
 * En producción (proveedor de storage = supabase) redirige /uploads/{file} a la
 * URL pública del bucket en Supabase Storage. Así el frontend sigue usando las
 * rutas relativas "/uploads/..." sin ningún cambio, y el navegador obtiene el
 * archivo directamente de Supabase (CDN).
 *
 * Solo existe cuando el proveedor es supabase; en local/desarrollo los archivos
 * los sirve WebMvcConfig desde el disco.
 */
@Controller
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "supabase")
public class UploadsRedirectController {

    private final SupabaseStorageService storageService;

    public UploadsRedirectController(SupabaseStorageService storageService) {
        this.storageService = storageService;
    }

    @GetMapping("/uploads/{filename:.+}")
    public RedirectView redirectToSupabase(@PathVariable String filename) {
        return new RedirectView(storageService.getPublicBaseUrl() + "/" + filename);
    }
}
