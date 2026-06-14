package com.example.websport.controller;

import com.example.websport.dto.request.AddToCartReq;
import com.example.websport.entity.User;
import com.example.websport.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
public class CartController {
    private final CartService cartService;

    // Lấy ID người dùng từ Token JWT
    private Long getCurrentUserId() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }

    // Xem giỏ hàng
    @GetMapping
    public ResponseEntity<?> getCart() {
        return ResponseEntity.ok(cartService.getMyCart(getCurrentUserId()));
    }

    // Thêm vào giỏ hàng
    @PostMapping("/add")
    public ResponseEntity<?> addToCart(@RequestBody AddToCartReq req) {
        try {
            return ResponseEntity.ok(cartService.addToCart(getCurrentUserId(), req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Cập nhật số lượng (Ví dụ khách bấm nút + / -)
    @PutMapping("/update/{cartItemId}")
    public ResponseEntity<?> updateQuantity(@PathVariable Long cartItemId, @RequestParam Integer quantity) {
        try {
            return ResponseEntity.ok(cartService.updateItemQuantity(getCurrentUserId(), cartItemId, quantity));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Xóa 1 món khỏi giỏ
    @DeleteMapping("/remove/{cartItemId}")
    public ResponseEntity<?> removeItem(@PathVariable Long cartItemId) {
        try {
            return ResponseEntity.ok(cartService.removeCartItem(getCurrentUserId(), cartItemId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
