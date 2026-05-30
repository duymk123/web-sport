package com.example.websport.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@Builder
public class ProductListResponse implements Serializable {
    private Long id;
    private String name;
    private String brand;
    private Long categoryId;
    private Long typeId;
    private Double price;
    private String imageUrl;

}
