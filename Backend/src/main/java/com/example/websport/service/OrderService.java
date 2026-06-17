package com.example.websport.service;

import com.example.websport.dto.request.CheckoutReq;
import com.example.websport.dto.request.OrderStatusReq;
import com.example.websport.dto.response.OrderRes;

import java.util.List;

public interface OrderService {
    OrderRes placeOrder(Long userId, CheckoutReq req);
    List<OrderRes> getMyOrders(Long userId);

    // Admin
    List<OrderRes> getAllOrders();
    OrderRes adminUpdateStatus(Long orderId, OrderStatusReq req);

    // User xác nhận đã nhận hàng
    OrderRes userConfirmDelivered(Long userId, Long orderId);
}
