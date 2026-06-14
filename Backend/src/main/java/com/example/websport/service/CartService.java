package com.example.websport.service;

import com.example.websport.dto.request.AddToCartReq;
import com.example.websport.dto.response.CartRes;

public interface CartService {
    CartRes getMyCart(Long userId);
    CartRes addToCart(Long userId, AddToCartReq req);
    CartRes updateItemQuantity(Long userId, Long cartItemId, Integer quantity);
    CartRes removeCartItem(Long userId, Long cartItemId);
    void clearCart(Long userId); // Dùng cho bước Thanh toán sau này
}
