package com.example.websport.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ProductListResponse {
    private Long id;
    private String name;
    private String brand;
    private Long categoryId;
    private Long typeId;
    private Double startingPrice;
    private String imageUrl;

}
