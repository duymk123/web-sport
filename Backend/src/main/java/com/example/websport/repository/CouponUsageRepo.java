package com.example.websport.repository;

import com.example.websport.entity.CouponUsage;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CouponUsageRepo extends JpaRepository<CouponUsage, Long> {
    boolean existsByUserIdAndCouponId(Long userId, Long couponId);
}
