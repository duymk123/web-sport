package com.example.websport.dto.request;

import com.example.websport.common.EnumStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ProductUpdateReq { //DÀNH CHO ADMIN
    private String name;
    private String brand;
    private Long categoryId;
    private Long typeId;
    private String description;
    private EnumStatus status;
    private List<String> imageUrls;
    private List<VariantDto> variants;

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class VariantDto {
        private Long id; // Có thể null nếu thêm mới
        private String sku;
        private String color;
        private String size;
        private java.math.BigDecimal price;
        private Integer stockQuantity;
    }
}
