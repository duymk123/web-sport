package com.example.websport.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@Builder
public class CartItemRes implements Serializable {
    private Long cartItemId;     // Dùng cái này để Frontend gọi API Xóa hoặc Cập nhật số lượng

    private Long variantId;      // ID của biến thể
    private Long productId;      // ID của sản phẩm gốc
    private String productName;  // Tên giày/vợt
    private String color;        // Màu sắc
    private String size;         // Kích cỡ
    private String imageUrl;     // Ảnh đại diện sản phẩm

    private Double price;        // Giá của 1 sản phẩm
    private Integer quantity;    // Số lượng khách mua
    private Double subTotal;     // Thành tiền = price * quantity
}
