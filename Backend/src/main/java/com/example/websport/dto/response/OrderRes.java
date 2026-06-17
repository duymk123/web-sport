package com.example.websport.dto.response;

import com.example.websport.common.OrderStatus;
import com.example.websport.common.PaymentMethod;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class OrderRes {
    private Long id;
    private String fullName;
    private String phoneNumber;
    private String shippingAddress;
    private Double totalAmount;
    private PaymentMethod paymentMethod;
    private OrderStatus status;
    private String note;
    private String couponCodes;
    private Double discountAmount;
    private String userName;
    private List<OrderItemRes> items;
    private LocalDateTime createdAt;

    @Getter
    @Setter
    @Builder
    public static class OrderItemRes {
        private Long id;
        private String productName;
        private String color;
        private String size;
        private Integer quantity;
        private Double priceAtPurchase;
        private String imageUrl;
    }
}
