package com.example.websport.repository;

import com.example.websport.entity.ReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReturnRequestRepo extends JpaRepository<ReturnRequest, Long> {
    boolean existsByUser_IdAndOrder_Id(Long userId, Long orderId);

    List<ReturnRequest> findByUser_IdOrderByCreatedAtDesc(Long userId);

    List<ReturnRequest> findAllByOrderByCreatedAtDesc();
}
