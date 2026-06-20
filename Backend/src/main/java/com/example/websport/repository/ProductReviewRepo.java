package com.example.websport.repository;

import com.example.websport.entity.ProductReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductReviewRepo extends JpaRepository<ProductReview, Long> {
    boolean existsByUser_IdAndProduct_IdAndOrder_Id(Long userId, Long productId, Long orderId);

    List<ProductReview> findByOrder_IdOrderByCreatedAtDesc(Long orderId);

    List<ProductReview> findByProduct_IdOrderByCreatedAtDesc(Long productId);

    List<ProductReview> findByUser_IdOrderByCreatedAtDesc(Long userId);
}
