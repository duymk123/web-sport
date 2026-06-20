package com.example.websport.controller;

import com.example.websport.dto.request.ReturnRequestStatusReq;
import com.example.websport.service.ReturnRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/return-requests")
@RequiredArgsConstructor
public class AdminReturnRequestController {
    private final ReturnRequestService returnRequestService;

    @GetMapping
    public ResponseEntity<?> getAllReturnRequests() {
        return ResponseEntity.ok(returnRequestService.getAllReturnRequests());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody ReturnRequestStatusReq req) {
        try {
            return ResponseEntity.ok(returnRequestService.adminUpdateStatus(id, req));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
