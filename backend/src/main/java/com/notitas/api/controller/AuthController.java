package com.notitas.api.controller;

import com.notitas.api.model.User;
import com.notitas.api.payload.JwtResponse;
import com.notitas.api.payload.LoginRequest;
import com.notitas.api.payload.MessageResponse;
import com.notitas.api.payload.RegisterRequest;
import com.notitas.api.repository.UserRepository;
import com.notitas.api.security.JwtUtils;
import com.notitas.api.security.UserDetailsImpl;
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

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    /** SameSite de la cookie JWT (None en prod cross-site; Lax/Strict si la
     *  API y el frontend comparten dominio). Configurable por env var. */
    @Value("${app.cookie.samesite:None}")
    private String cookieSameSite;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest,
                                              HttpServletResponse response) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(), loginRequest.getPassword()));

            String jwt = jwtUtils.generateJwtToken(authentication);

            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

            addJwtCookie(response, jwt);

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

        String newToken = jwtUtils.generateTokenFromUsername(user.getEmail(), user.getTokenVersion());
        addJwtCookie(response, newToken);
        return ResponseEntity.ok(new JwtResponse(newToken, user.getId(), user.getEmail(), user.getName(), user.getAvatar()));
    }

    private void addJwtCookie(HttpServletResponse response, String jwt) {
        Cookie cookie = new Cookie("jwt", jwt);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(24 * 60 * 60); // 24 hours
        cookie.setSecure(cookieSecure);
        cookie.setAttribute("SameSite", cookieSameSite);
        response.addCookie(cookie);
    }
}
