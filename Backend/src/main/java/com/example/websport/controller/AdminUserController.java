package com.example.websport.controller;

import com.example.websport.repository.UserRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.stream.Collectors;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/users")
public class AdminUserController {
    private final UserRepo userRepo;

    @GetMapping
    public ResponseEntity<?> getAllUsers() {
        var users = userRepo.findAll().stream().map(user -> Map.of(
                "id", user.getId(),
                "username", user.getUsername() != null ? user.getUsername() : "",
                "fullname", user.getFullname() != null ? user.getFullname() : "",
                "phoneNumber", user.getPhoneNumber() != null ? user.getPhoneNumber() : "",
                "role", user.getRole() != null ? user.getRole().name() : "",
                "status", user.getStatus() != null ? user.getStatus().name() : "",
                "createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : ""
        )).collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }
}
