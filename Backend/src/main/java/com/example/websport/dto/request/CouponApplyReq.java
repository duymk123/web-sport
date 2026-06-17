package com.example.websport.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class CouponApplyReq implements Serializable {
    private String code;
    private Double orderTotal;
}
