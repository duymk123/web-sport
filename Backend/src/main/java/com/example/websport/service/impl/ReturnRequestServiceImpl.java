package com.example.websport.service.impl;

import com.example.websport.common.OrderStatus;
import com.example.websport.common.ReturnRequestStatus;
import com.example.websport.dto.request.ReturnRequestCreateReq;
import com.example.websport.dto.request.ReturnRequestStatusReq;
import com.example.websport.dto.response.ReturnRequestRes;
import com.example.websport.entity.Order;
import com.example.websport.entity.ReturnRequest;
import com.example.websport.entity.User;
import com.example.websport.repository.OrderRepo;
import com.example.websport.repository.ReturnRequestRepo;
import com.example.websport.repository.UserRepo;
import com.example.websport.service.ReturnRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReturnRequestServiceImpl implements ReturnRequestService {
    private final ReturnRequestRepo returnRequestRepo;
    private final OrderRepo orderRepo;
    private final UserRepo userRepo;

    @Override
    @Transactional
    public ReturnRequestRes createReturnRequest(Long userId, ReturnRequestCreateReq req) {
        if (req.getOrderId() == null) {
            throw new RuntimeException("Vui long chon don hang can tra!");
        }
        if (req.getReason() == null || req.getReason().trim().isEmpty()) {
            throw new RuntimeException("Vui long nhap ly do tra hang!");
        }

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay User"));

        Order order = orderRepo.findById(req.getOrderId())
                .orElseThrow(() -> new RuntimeException("Khong tim thay don hang #" + req.getOrderId()));

        if (!order.getUser().getId().equals(userId)) {
            throw new RuntimeException("Ban khong co quyen yeu cau tra don hang nay!");
        }
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new RuntimeException("Chi co the yeu cau tra hang khi don hang da giao thanh cong!");
        }
        if (returnRequestRepo.existsByUser_IdAndOrder_Id(userId, order.getId())) {
            throw new RuntimeException("Don hang nay da co yeu cau tra hang!");
        }

        ReturnRequest returnRequest = ReturnRequest.builder()
                .user(user)
                .order(order)
                .reason(req.getReason().trim())
                .status(ReturnRequestStatus.PENDING)
                .build();

        return mapToRes(returnRequestRepo.save(returnRequest));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReturnRequestRes> getMyReturnRequests(Long userId) {
        return returnRequestRepo.findByUser_IdOrderByCreatedAtDesc(userId)
                .stream().map(this::mapToRes).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReturnRequestRes> getAllReturnRequests() {
        return returnRequestRepo.findAllByOrderByCreatedAtDesc()
                .stream().map(this::mapToRes).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ReturnRequestRes adminUpdateStatus(Long id, ReturnRequestStatusReq req) {
        if (req.getStatus() == null) {
            throw new RuntimeException("Vui long chon trang thai yeu cau tra hang!");
        }
        if (req.getStatus() == ReturnRequestStatus.PENDING) {
            throw new RuntimeException("Admin chi co the duyet hoac tu choi yeu cau tra hang!");
        }

        ReturnRequest returnRequest = returnRequestRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Khong tim thay yeu cau tra hang #" + id));

        if (returnRequest.getStatus() != ReturnRequestStatus.PENDING) {
            throw new RuntimeException("Yeu cau tra hang nay da duoc xu ly!");
        }

        returnRequest.setStatus(req.getStatus());
        return mapToRes(returnRequestRepo.save(returnRequest));
    }

    private ReturnRequestRes mapToRes(ReturnRequest returnRequest) {
        return ReturnRequestRes.builder()
                .id(returnRequest.getId())
                .userId(returnRequest.getUser() != null ? returnRequest.getUser().getId() : null)
                .username(returnRequest.getUser() != null ? returnRequest.getUser().getUsername() : "")
                .orderId(returnRequest.getOrder() != null ? returnRequest.getOrder().getId() : null)
                .reason(returnRequest.getReason())
                .status(returnRequest.getStatus())
                .createdAt(returnRequest.getCreatedAt())
                .updatedAt(returnRequest.getUpdatedAt())
                .build();
    }
}
