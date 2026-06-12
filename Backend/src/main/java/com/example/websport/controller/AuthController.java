package com.example.websport.controller;

import com.example.websport.dto.request.*;
import com.example.websport.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
@Validated
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
    public ResponseEntity<?> login(@RequestBody @Valid LoginReq req) {
        try {
            return ResponseEntity.ok(authService.login(req));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @PostMapping("/change-password")  //Change Password
    public ResponseEntity<?> changePassword(@RequestBody @Valid ChangePasswordReq req) {
        try {
            String message = authService.ChangePassword(req);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            // Trả về lỗi 400 (Bad Request) nếu sai mật khẩu cũ
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // QUÊN MẬT KHẨU
    @PostMapping("forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody @Valid  ForgotPasswordReq req) {
        try {
            return ResponseEntity.ok(authService.forgotPassword(req));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // ĐẶT LẠI MẬT KHẨU
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordReq req) {
        try {
            return ResponseEntity.ok(authService.resetPassword(req));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // CẬP NHẬT THÔNG TIN CÁ NHÂN
    @PutMapping("/update-profile")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileReq req) {
        try {
            return ResponseEntity.ok(authService.updateProfile(req));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // LẤY THÔNG TIN CÁ NHÂN
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestParam String username) {
        try {
            return ResponseEntity.ok(authService.getProfile(username));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}