package com.example.websport.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReturnRequestCreateReq {
    private Long orderId;
    private String reason;
}
