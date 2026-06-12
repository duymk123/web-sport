package com.example.websport.controller;

import com.example.websport.dto.request.UserAddressReq;
import com.example.websport.entity.User;
import com.example.websport.service.UserAddressService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/addresses")
@Validated
public class UserAddressController {
    private final UserAddressService userAddressService;

    // Hàm tự động lấy ID của user đang đăng nhập từ Token
    private Long getCurrentUserId() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }

    @GetMapping
    public ResponseEntity<?> getMyAddresses() {
        return ResponseEntity.ok(userAddressService.getUserAddresses(getCurrentUserId()));
    }

    @PostMapping
    public ResponseEntity<?> addAddress(@RequestBody @Valid UserAddressReq req) {
        try {
            return ResponseEntity.ok(userAddressService.addAddress(getCurrentUserId(), req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAddress(@PathVariable Long id, @RequestBody @Valid UserAddressReq req) {
        try {
            return ResponseEntity.ok(userAddressService.updateAddress(getCurrentUserId(), id, req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAddress(@PathVariable Long id) {
        try {
            userAddressService.deleteAddress(getCurrentUserId(), id);
            return ResponseEntity.ok("Đã xóa địa chỉ thành công");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // API phụ: Set 1 địa chỉ làm mặc định nhanh chóng
    @PatchMapping("/{id}/default")
    public ResponseEntity<?> setDefault(@PathVariable Long id) {
        try {
            userAddressService.setDefaultAddress(getCurrentUserId(), id);
            return ResponseEntity.ok("Đã đặt làm địa chỉ mặc định");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
