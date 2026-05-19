package com.example.websport.dto.request;

import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;

@Getter
@Setter
public class VariantReq {
    private String sku;
    private String color;
    private String size;
    private BigDecimal price;
    private Integer stockQuantity;
}
