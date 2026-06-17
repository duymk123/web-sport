package com.example.websport.dto.request;

import com.example.websport.common.OrderStatus;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class OrderStatusReq implements Serializable {
    private OrderStatus status;
    private String note;
}
