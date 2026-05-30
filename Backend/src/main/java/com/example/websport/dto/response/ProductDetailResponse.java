package com.example.websport.dto.response;

import com.example.websport.common.EnumStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.awt.*;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
public class ProductDetailResponse implements Serializable {
    private Long id;
    private String name;
    private String brand;
    private Long categoryId;
    private Long typeId;
    private String description;
    private Map<String, Object> specification;
    private EnumStatus status;

    private List<VariantDetailDto> productVariants;
    private List<ImageDetailDto> productImages;


    @Getter
    @Setter
    @Builder
    public static class VariantDetailDto{
        private Long id;
        private String sku;
        private String color;
        private String size;
        private BigDecimal price;
        private Integer stockQuantity;
    }

    @Getter
    @Setter
    @Builder
    public static class ImageDetailDto{
        private Long id;
        private String imageUrl;
    }

}
