package com.example.websport.controller;

import com.example.websport.dto.request.ChangePasswordReq;
import com.example.websport.dto.request.LoginReq;
import com.example.websport.dto.request.RegisterReq;
import com.example.websport.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")  // Register
    public ResponseEntity<?> register(@RequestBody RegisterReq req) {
        try {
            return ResponseEntity.ok(authService.register(req));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/login")   //Login
    public ResponseEntity<?> login(@RequestBody LoginReq req) {
        try {
            return ResponseEntity.ok(authService.login(req));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @PostMapping("/change-password")  //Change Password
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordReq req) {
        try {
            String message = authService.ChangePassword(req);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            // Trả về lỗi 400 (Bad Request) nếu sai mật khẩu cũ
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}