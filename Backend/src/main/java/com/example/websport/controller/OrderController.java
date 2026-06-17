package com.example.websport.controller;

import com.example.websport.dto.request.CheckoutReq;
import com.example.websport.entity.User;
import com.example.websport.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor

public class OrderController {
    private final OrderService orderService;

    // Hàm tự động lấy ID của user đang đăng nhập từ Token
    private Long getCurrentUserId() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }

    // API 1: Đặt hàng (Checkout)
    @PostMapping("/checkout")
    public ResponseEntity<?> placeOrder(@RequestBody CheckoutReq req) {
        try {
            return ResponseEntity.ok(orderService.placeOrder(getCurrentUserId(), req));
        } catch (RuntimeException e) {
            // Trả về lỗi 400 (Bad Request) nếu giỏ hàng trống, hết tồn kho, hoặc sai địa chỉ
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // API 2: Lấy danh sách lịch sử đơn hàng của người dùng hiện tại
    @GetMapping("/my-orders")
    public ResponseEntity<?> getMyOrders() {
        return ResponseEntity.ok(orderService.getMyOrders(getCurrentUserId()));
    }

    // API 3: User xác nhận đã nhận hàng
    @PatchMapping("/{id}/confirm-delivered")
    public ResponseEntity<?> confirmDelivered(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(orderService.userConfirmDelivered(getCurrentUserId(), id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
