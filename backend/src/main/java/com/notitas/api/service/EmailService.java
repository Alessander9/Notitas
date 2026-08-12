package com.notitas.api.service;

public interface EmailService {

    /**
     * Indica si hay un proveedor de email configurado (clave API presente).
     * Cuando no hay configuración, la app no envía correos y expone el enlace
     * de recuperación en la respuesta (solo fuera de producción).
     */
    boolean isConfigured();

    /** Envía el correo de recuperación de contraseña con el enlace de reset. */
    void sendPasswordResetEmail(String to, String resetLink);
}
