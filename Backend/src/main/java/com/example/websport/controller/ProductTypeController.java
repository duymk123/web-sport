package com.example.websport.controller;

import com.example.websport.entity.ProductType;
import com.example.websport.repository.ProductTypeRepo;
import com.example.websport.service.ProductTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/product-type")
public class ProductTypeController {

    @Autowired
    private ProductTypeService productTypeService;

    @GetMapping //Giày | Quần áo | Dụng cụ | Phụ kiện
    ResponseEntity<List<ProductType>> findAll() {
        List<ProductType> productTypeList = productTypeService.findAll();
        return ResponseEntity.ok(productTypeList);
    }
}
