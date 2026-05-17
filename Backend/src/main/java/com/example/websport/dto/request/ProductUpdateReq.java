package com.example.websport.dto.request;

import com.example.websport.common.EnumStatus;

import java.util.Map;

public class ProductUpdateReq { //DÀNH CHO ADMIN
    private String name;
    private String brand;
    private Long CategoryId;
    private Long typeId;
    private String description;
    private Map<String, Object> specification;
    private EnumStatus status;
}
