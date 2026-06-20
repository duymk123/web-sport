package com.example.websport.service;

import com.example.websport.dto.request.ProductReviewCreateReq;
import com.example.websport.dto.response.ProductReviewRes;

import java.util.List;

public interface ProductReviewService {
    ProductReviewRes createReview(Long userId, ProductReviewCreateReq req);

    List<ProductReviewRes> getMyReviews(Long userId);

    List<ProductReviewRes> getReviewsByOrder(Long userId, Long orderId);

    List<ProductReviewRes> getReviewsByProduct(Long productId);
}
