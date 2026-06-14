package com.example.websport.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.util.List;

@Getter
@Setter
@Builder
public class CartRes implements Serializable {
    private Long cartId;               // ID của giỏ hàng
    private List<CartItemRes> items;   // Danh sách các món đồ bên trên
    private Double totalPrice;         // Tổng tiền của cả giỏ (Cộng tất cả subTotal lại)
}
