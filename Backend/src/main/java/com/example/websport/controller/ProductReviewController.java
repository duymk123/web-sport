package com.example.websport.controller;

import com.example.websport.dto.request.ProductReviewCreateReq;
import com.example.websport.entity.User;
import com.example.websport.service.ProductReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
public class ProductReviewController {
    private final ProductReviewService productReviewService;

    private Long getCurrentUserId() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }

    @PostMapping
    public ResponseEntity<?> createReview(@RequestBody ProductReviewCreateReq req) {
        try {
            return ResponseEntity.ok(productReviewService.createReview(getCurrentUserId(), req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-reviews")
    public ResponseEntity<?> getMyReviews() {
        return ResponseEntity.ok(productReviewService.getMyReviews(getCurrentUserId()));
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<?> getReviewsByOrder(@PathVariable Long orderId) {
        try {
            return ResponseEntity.ok(productReviewService.getReviewsByOrder(getCurrentUserId(), orderId));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/products/{productId}")
    public ResponseEntity<?> getReviewsByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(productReviewService.getReviewsByProduct(productId));
    }
}
