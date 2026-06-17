package com.example.websport.common;

public enum OrderStatus {
    PENDING,    // Chờ xác nhận
    CONFIRMED,  // Đã xác nhận
    SHIPPING,   // Đang giao hàng
    DELIVERED,  // Đã giao thành công
    FAILED,     // Giao hàng thất bại (khách không nghe máy)
    CANCELLED   // Đã hủy
}
