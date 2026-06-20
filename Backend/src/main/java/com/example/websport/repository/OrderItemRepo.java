package com.example.websport.repository;

import com.example.websport.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepo extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrder_Id(Long orderId);

    boolean existsByOrder_IdAndProductVariant_Product_Id(Long orderId, Long productId);
}
