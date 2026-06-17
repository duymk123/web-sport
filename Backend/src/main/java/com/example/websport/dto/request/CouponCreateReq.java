package com.example.websport.dto.request;

import com.example.websport.common.DiscountType;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@Setter
public class CouponCreateReq implements Serializable {
    private String code;
    private DiscountType discountType;
    private Double discountValue;
    private Double maxDiscountAmount;
    private Integer usageLimit;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Boolean isActive;
}
