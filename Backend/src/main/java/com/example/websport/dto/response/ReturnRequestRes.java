package com.example.websport.dto.response;

import com.example.websport.common.ReturnRequestStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ReturnRequestRes {
    private Long id;
    private Long userId;
    private String username;
    private Long orderId;
    private String reason;
    private ReturnRequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
