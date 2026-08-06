package com.notitas.api.controller;

import com.notitas.api.WebMvcConfig;
import com.notitas.api.service.FileStorageService;
import com.notitas.api.service.SupabaseStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Verifica el wiring del proveedor de storage "supabase": se instancia
 * {@link SupabaseStorageService}, se desactiva el resource handler local
 * ({@link WebMvcConfig}) y las rutas /uploads/** redirigen al bucket público.
 */
@SpringBootTest(properties = {
        "app.storage.provider=supabase",
        "app.supabase.url=https://xyzproject.supabase.co",
        "app.supabase.service-role-key=test-key"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SupabaseStorageConfigIntegrationTest {

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private ApplicationContext context;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void supabaseProvider_wiresSupabaseStorageServiceAndRedirectController() {
        assertThat(fileStorageService).isInstanceOf(SupabaseStorageService.class);
        assertThat(context.getBean(UploadsRedirectController.class)).isNotNull();
        // El resource handler local no debe existir con este proveedor
        assertThatThrownBy(() -> context.getBean(WebMvcConfig.class))
                .isInstanceOf(NoSuchBeanDefinitionException.class);
    }

    @Test
    void uploadsPath_redirectsToSupabasePublicUrl() throws Exception {
        mockMvc.perform(get("/uploads/foto.png"))
                .andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location",
                        "https://xyzproject.supabase.co/storage/v1/object/public/uploads/foto.png"));
    }
}
