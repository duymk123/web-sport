package com.example.websport.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ProductReviewRes {
    private Long id;
    private Long userId;
    private String username;
    private Long productId;
    private String productName;
    private Long orderId;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
}
