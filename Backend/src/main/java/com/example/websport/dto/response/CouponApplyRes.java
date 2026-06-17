package com.example.websport.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import java.io.Serializable;

@Setter
@Getter
@Builder
public class CouponApplyRes implements Serializable {
    private Double discountAmount;
    private Double finalTotal;
    private String message;
}
