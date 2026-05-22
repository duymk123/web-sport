package com.example.websport.dto.request;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ProductCreateReq { // DÀNH CHO ADMIN
    private String name;
    private String brand;
    private Long categoryId;
    private Long typeId;
    private String description;
//    private Map<String, Object> specification;
    private List<String> imageUrls;
    private List<VariantDto> variants;

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class VariantDto {
        private String sku;
        private String color;
        private String size;
        private BigDecimal price;
        private Integer stockQuantity;
    }
}
