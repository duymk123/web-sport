package com.example.websport.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductReviewCreateReq {
    private Long orderId;
    private Long productId;
    private Integer rating;
    private String comment;
}
