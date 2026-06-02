package com.example.websport.config;

import com.example.websport.common.EnumRole;
import com.example.websport.common.EnumStatus;
import com.example.websport.entity.User;
import com.example.websport.repository.UserRepo;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initData(UserRepo userRepo, PasswordEncoder passwordEncoder) {
        return args -> {
            // Check if admin user exists
            if (userRepo.findByUsername("admin").isEmpty()) {
                User admin = User.builder()
                        .username("admin")
                        .password(passwordEncoder.encode("admin"))
                        .fullname("Quản Trị Viên")
                        .phoneNumber("0123456789")
                        .role(EnumRole.ADMIN)
                        .status(EnumStatus.ACTIVE)
                        .build();
                userRepo.save(admin);
                System.out.println("====== Admin account created (admin/admin) ======");
            }
        };
    }
}
