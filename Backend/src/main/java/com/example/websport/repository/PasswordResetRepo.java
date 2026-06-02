package com.example.websport.repository;

import com.example.websport.entity.PasswordReset;
import com.example.websport.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetRepo extends JpaRepository<PasswordReset, Long> {
    Optional<PasswordReset> findByResetToken(String resetToken);

    void deleteByUser(User user);
}
