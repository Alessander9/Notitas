package com.notitas.api.repository;

import com.notitas.api.model.PasswordResetToken;
import com.notitas.api.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    Optional<PasswordResetToken> findByToken(String token);

    /** Invalida los tokens anteriores sin usar del usuario (nuevo token los reemplaza). */
    void deleteByUser(User user);
}
