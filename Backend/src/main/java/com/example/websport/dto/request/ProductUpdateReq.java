package com.example.websport.dto.request;

import com.example.websport.common.EnumStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
//    private Map<String, Object> specification;
    private EnumStatus status;
}
