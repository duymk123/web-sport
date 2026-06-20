package com.example.websport.controller;

import com.example.websport.dto.request.ReturnRequestCreateReq;
import com.example.websport.entity.User;
import com.example.websport.service.ReturnRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/return-requests")
@RequiredArgsConstructor
public class ReturnRequestController {
    private final ReturnRequestService returnRequestService;

    private Long getCurrentUserId() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }

    @PostMapping
    public ResponseEntity<?> createReturnRequest(@RequestBody ReturnRequestCreateReq req) {
        try {
            return ResponseEntity.ok(returnRequestService.createReturnRequest(getCurrentUserId(), req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-requests")
    public ResponseEntity<?> getMyReturnRequests() {
        return ResponseEntity.ok(returnRequestService.getMyReturnRequests(getCurrentUserId()));
    }
}
