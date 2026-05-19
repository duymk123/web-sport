package com.example.websport.dto.request;


import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class ProductCreateReq { // DÀNH CHO ADMIN
    private String name;
    private String brand;
    private Long CategoryId;
    private Long typeId;
    private String description;
//    private Map<String, Object> specification;
}
