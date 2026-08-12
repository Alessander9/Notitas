package com.notitas.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Envío de emails transaccionales vía la API REST de Resend
 * (https://resend.com/docs/api-reference/emails/send-email) — sin SMTP.
 *
 * Configuración:
 *   app.email.provider=none|resend     (por defecto 'none' en dev, 'resend' en prod)
 *   app.email.resend.api-key=...       (env var RESEND_API_KEY)
 *   app.email.from=...                 (remitente verificado en Resend)
 *
 * Si no hay clave API, isConfigured() devuelve false y no se envía nada
 * (el flujo de recuperación expone el enlace en la respuesta para dev/test).
 */
@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);
    private static final String RESEND_API_URL = "https://api.resend.com/emails";

    @Value("${app.email.provider:none}")
    private String provider;

    @Value("${app.email.resend.api-key:}")
    private String apiKey;

    @Value("${app.email.from:Notitas <onboarding@resend.dev>}")
    private String from;

    @Override
    public boolean isConfigured() {
        return "resend".equalsIgnoreCase(provider)
                && apiKey != null
                && !apiKey.isBlank();
    }

    @Override
    public void sendPasswordResetEmail(String to, String resetLink) {
        if (!isConfigured()) {
            log.info("Email no configurado: no se envía correo de recuperación a {}", to);
            return;
        }
        try {
            RestClient client = RestClient.builder()
                    .baseUrl(RESEND_API_URL)
                    .defaultHeader("Authorization", "Bearer " + apiKey)
                    .build();

            Map<String, Object> body = Map.of(
                    "from", from,
                    "to", List.of(to),
                    "subject", "Recupera tu contraseña de Notitas",
                    "html", buildResetEmailHtml(resetLink)
            );

            client.post().body(body).retrieve().toBodilessEntity();
            log.info("Email de recuperación enviado a {}", to);
        } catch (Exception e) {
            // El fallo del email no debe romper la petición: se loguea y se
            // responde igualmente con el mensaje genérico.
            log.error("Error enviando email de recuperación a {}: {}", to, e.getMessage());
        }
    }

    private String buildResetEmailHtml(String resetLink) {
        return "<div style=\"font-family:Inter, Arial, sans-serif; max-width:520px; margin:0 auto; "
                + "padding:32px; background:#ffffff; border:1px solid #e5e9f0; border-radius:16px;\">"
                + "<h2 style=\"color:#1f2430; margin:0 0 8px;\">🔐 Recupera tu contraseña</h2>"
                + "<p style=\"color:#5a6a7e; font-size:14px; line-height:1.6; margin:0 0 24px;\">"
                + "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de Notitas. "
                + "Haz clic en el botón para elegir una nueva. Este enlace es válido por <strong>60 minutos</strong>.</p>"
                + "<a href=\"" + resetLink + "\" style=\"display:inline-block; background:#386c5f; color:#ffffff; "
                + "text-decoration:none; font-weight:600; padding:12px 24px; border-radius:12px;\">"
                + "Restablecer contraseña</a>"
                + "<p style=\"color:#8a97a8; font-size:12px; line-height:1.6; margin:24px 0 0;\">"
                + "Si no solicitaste este cambio, ignora este correo y tu contraseña seguirá igual. "
                + "También puedes copiar este enlace: " + resetLink + "</p>"
                + "</div>";
    }
}
