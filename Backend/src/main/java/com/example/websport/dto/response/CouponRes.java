package com.example.websport.dto.response;

import com.example.websport.common.DiscountType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class CouponRes implements Serializable {
    private Long id;
    private String code;
    private DiscountType discountType;
    private Double discountValue;
    private Double maxDiscountAmount;
    private Integer usageLimit;
    private Integer usedCount;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private Boolean isActive;
}
