package com.notitas.api.controller;

import com.notitas.api.model.User;
import com.notitas.api.payload.ForgotPasswordRequest;
import com.notitas.api.payload.JwtResponse;
import com.notitas.api.payload.LoginRequest;
import com.notitas.api.payload.MessageResponse;
import com.notitas.api.payload.RegisterRequest;
import com.notitas.api.payload.ResetPasswordRequest;
import com.notitas.api.repository.UserRepository;
import com.notitas.api.security.JwtUtils;
import com.notitas.api.security.UserDetailsImpl;
import com.notitas.api.service.EmailService;
import com.notitas.api.service.PasswordResetService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    PasswordResetService passwordResetService;

    @Autowired
    EmailService emailService;

    /**
     * Solo fuera de producción (dev/tests) se expone el enlace de reset en la
     * respuesta cuando no hay email configurado, para poder probar el flujo
     * localmente sin enviar correos.
     */
    @Value("${app.email.expose-reset-link:false}")
    private boolean exposeResetLink;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    /** SameSite de la cookie JWT (None en prod cross-site; Lax/Strict si la
     *  API y el frontend comparten dominio). Configurable por env var. */
    @Value("${app.cookie.samesite:None}")
    private String cookieSameSite;

    /** Cookie de sesión: se borra al cerrar el navegador. */
    private static final int SESSION_COOKIE_MAX_AGE = -1;

    /**
     * Expiración de la cookie "recordarme", en ms. La MISMA propiedad que usa
     * JwtUtils para el token, así cookie y JWT nunca se desincronizan. Se
     * convierte a segundos al fijar el maxAge de la cookie.
     */
    @Value("${app.jwt.remember-me-expiration-ms}")
    private long rememberMeExpirationMs;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest,
                                              HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(), loginRequest.getPassword()));

            boolean rememberMe = loginRequest.isRememberMe();
            String jwt = jwtUtils.generateJwtToken(authentication, rememberMe);

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

            addJwtCookie(response, jwt, rememberMe);

            return ResponseEntity.ok(new JwtResponse(jwt, userDetails.getId(),
                    userDetails.getEmail(), userDetails.getName(),
                    userDetails.getAvatar()));
        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Credenciales inválidas"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: El email ya está registrado"));
        }

        User user = new User(
                registerRequest.getName(),
                registerRequest.getEmail(),
                encoder.encode(registerRequest.getPassword())
        );
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("Usuario registrado exitosamente"));
    }

    /**
     * Logout con revocación real: incrementa el token_version del usuario para
     * invalidar todos los JWT emitidos antes (esta sesión y cualquier otra
     * copia del token), y borra la cookie. Funciona también con tokens ya
     * expirados (solo se necesita una firma válida para identificar al usuario).
     */
    /**
     * Recuperación de contraseña (paso 1): genera un token de un solo uso y
     * envía el enlace por email. La respuesta es idéntica exista o no la
     * cuenta, para no revelar qué emails están registrados.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        String resetLink = passwordResetService.createPasswordResetLink(request.getEmail());

        Map<String, Object> body = new HashMap<>();
        body.put("message", "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.");
        // En dev/tests sin email configurado se devuelve el enlace para probar
        // el flujo completo sin depender de un proveedor de correo.
        if (resetLink != null && exposeResetLink && !emailService.isConfigured()) {
            body.put("devResetLink", resetLink);
        }
        return ResponseEntity.ok(body);
    }

    /**
     * Recuperación de contraseña (paso 2): valida el token y fija la nueva
     * contraseña. Revoca todas las sesiones activas del usuario.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        boolean ok = passwordResetService.resetPassword(request.getToken(), request.getPassword());
        if (!ok) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("El enlace de recuperación es inválido o ha expirado"));
        }
        return ResponseEntity.ok(new MessageResponse("Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña."));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser(HttpServletRequest request, HttpServletResponse response) {
        String jwt = JwtUtils.extractJwt(request);
        if (jwt != null) {
            Claims claims = jwtUtils.parseClaimsIgnoreExpiration(jwt);
            if (claims != null) {
                userRepository.findByEmail(claims.getSubject()).ifPresent(user -> {
                    user.setTokenVersion(user.getTokenVersion() + 1);
                    userRepository.save(user);
                });
            }
        }

        Cookie cookie = new Cookie("jwt", "");
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(0);
        cookie.setSecure(cookieSecure);
        cookie.setAttribute("SameSite", cookieSameSite);
        response.addCookie(cookie);

        return ResponseEntity.ok(new MessageResponse("Sesión cerrada exitosamente"));
    }

    /**
     * Renovación deslizante: si la cookie JWT es válida (firma + no expirado +
     * versión de sesión vigente), emite un JWT nuevo y renueva la cookie.
     * El frontend lo llama al arrancar y periódicamente, así la sesión no se
     * corta a las 24 h mientras la app está en uso. Los tokens expirados o
     * revocados reciben 401 (el frontend cierra sesión limpiamente).
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshSession(HttpServletRequest request, HttpServletResponse response) {
        String jwt = JwtUtils.extractJwt(request);
        if (jwt == null || !jwtUtils.validateJwtToken(jwt)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Sesión no válida o expirada"));
        }

        String email = jwtUtils.getUserNameFromJwtToken(jwt);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Usuario no encontrado"));
        }
        if (jwtUtils.getTokenVersionFromJwtToken(jwt) != user.getTokenVersion()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new MessageResponse("Sesión revocada"));
        }

        // El refresh conserva la marca "recordarme" del token: ni degrada una
        // sesión persistente a cookie de navegador, ni promociona una sesión
        // normal a persistente.
        boolean rememberMe = jwtUtils.getRememberMeFromJwtToken(jwt);
        String newToken = jwtUtils.generateTokenFromUsername(user.getEmail(), user.getTokenVersion(), rememberMe);
        addJwtCookie(response, newToken, rememberMe);
        return ResponseEntity.ok(new JwtResponse(newToken, user.getId(), user.getEmail(), user.getName(), user.getAvatar()));
    }

    private void addJwtCookie(HttpServletResponse response, String jwt, boolean rememberMe) {
        Cookie cookie = new Cookie("jwt", jwt);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        // rememberMe → 30 días (casado con la expiración del JWT); si no,
        // cookie de sesión que se borra al cerrar el navegador.
        cookie.setMaxAge(rememberMe ? (int) (rememberMeExpirationMs / 1000) : SESSION_COOKIE_MAX_AGE);
        cookie.setSecure(cookieSecure);
        cookie.setAttribute("SameSite", cookieSameSite);
        response.addCookie(cookie);
    }
}
