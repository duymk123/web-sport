package com.example.websport.repository;

import com.example.websport.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartItemRepo extends JpaRepository<CartItem, Long> {

    //Lấy toàn bộ đồ trong 1 giỏ hàng
    List<CartItem> findByCart_Id(Long cartId);

    // Kiểm tra xem món đồ này đã có trong giỏ chưa (để nếu có rồi thì cộng dồn số lượng)
    Optional<CartItem> findByCart_IdAndProductVariant_Id(Long cartId, Long variantId);
}

