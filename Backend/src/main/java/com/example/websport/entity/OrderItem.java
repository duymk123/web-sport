package com.example.websport.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem implements Serializable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Chi tiết này thuộc về Đơn hàng nào
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnore
    private Order order;

    // Chi tiết này mua Biến thể sản phẩm nào (Đôi giày nào, size mấy)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_variant_id", nullable = false)
    private ProductVariant productVariant;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "price_at_purchase", nullable = false)
    private Double priceAtPurchase;
    // Quan trọng: Phải lưu chết cái giá lúc khách bấm mua.
    // Tránh trường hợp tháng sau admin tăng giá giày, vào xem lại hóa đơn cũ bị nhảy giá sai!
}
