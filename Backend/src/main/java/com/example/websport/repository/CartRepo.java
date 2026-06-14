package com.example.websport.repository;

import com.example.websport.entity.Cart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepo extends JpaRepository<Cart, Long> {

    // Tìm giỏ hàng của 1 user
    Optional<Cart> findByUser_Id(Long userId);

}
