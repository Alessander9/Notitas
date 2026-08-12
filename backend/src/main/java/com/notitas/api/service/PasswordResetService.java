package com.notitas.api.service;

import com.notitas.api.model.PasswordResetToken;
import com.notitas.api.model.User;
import com.notitas.api.repository.PasswordResetTokenRepository;
import com.notitas.api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class PasswordResetService {

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private EmailService emailService;

    /** URL base del frontend para construir el enlace de recuperación. */
    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    /** Vigencia de los tokens de recuperación. */
    @Value("${app.password-reset.expiration-ms:3600000}")
    private long expirationMs;

    /**
     * Crea un token de recuperación para el email y envía el correo.
     * Devuelve el enlace de reset (para dev/tests cuando el email no está
     * configurado) o null si el email no está registrado.
     */
    @Transactional
    public String createPasswordResetLink(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return null;
        }

        // Un nuevo token invalida los anteriores del mismo usuario.
        tokenRepository.deleteByUser(user);

        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken(
                user, token, LocalDateTime.now().plus(expirationMs, ChronoUnit.MILLIS));
        tokenRepository.save(resetToken);

        String resetLink = frontendUrl + "/reset-password?token=" + token;
        emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
        return resetLink;
    }

    /**
     * Valida el token y restablece la contraseña. También revoca todas las
     * sesiones activas del usuario (token_version++) para que los JWT antiguos
     * dejen de ser válidos. Devuelve false si el token es inválido, expiró o
     * ya fue usado.
     */
    @Transactional
    public boolean resetPassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token).orElse(null);
        if (resetToken == null || resetToken.isUsed()
                || resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            return false;
        }

        User user = resetToken.getUser();
        user.setPassword(encoder.encode(newPassword));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);

        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
        return true;
    }
}
