package com.example.websport.controller;

import com.example.websport.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RestController;
import com.example.websport.dto.request.CouponApplyReq;
import com.example.websport.service.CouponService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/coupons")
public class CouponController {
    private final CouponService couponService;

    // Hàm tự động lấy ID của user đang đăng nhập từ Token
    private Long getCurrentUserId() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }

    // Public: Lấy danh sách coupon đang active
    @GetMapping("/active")
    public ResponseEntity<?> getActiveCoupons() {
        return ResponseEntity.ok(couponService.getActiveCoupons());
    }

    @PostMapping("/apply")
    public ResponseEntity<?> applyCoupon(@RequestBody CouponApplyReq req) {
        try {
            return ResponseEntity.ok(couponService.applyCoupon(getCurrentUserId(), req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
