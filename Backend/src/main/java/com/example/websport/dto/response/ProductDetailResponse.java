package com.example.websport.dto.response;

import com.example.websport.common.EnumStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@Builder
public class ProductDetailResponse {
    private Long id;
    private String name;
    private String brand;
    private String description;
    private Map<String, Object> specification;
    private EnumStatus status;
}
