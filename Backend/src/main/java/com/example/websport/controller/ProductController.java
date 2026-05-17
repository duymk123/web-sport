package com.example.websport.controller;

import com.example.websport.dto.response.ProductListResponse;
import com.example.websport.entity.Product;
import com.example.websport.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

    @RestController
    @RequestMapping("/api/v1/products")
    public class ProductController {
        @Autowired
        private ProductService productService;


        @GetMapping
        public ResponseEntity<List<ProductListResponse>> getAllProducts(){
            return ResponseEntity.ok(productService.getAllProducts());
        }


//        // API gọi danh mục bằng parent_id
//        @GetMapping("/categories/{parentId}")
//        public ResponseEntity<List<ProductListResponse>> getProductsByParentCategory(@PathVariable Long parentId) {
//            return ResponseEntity.ok(productService.getProductsByParentCategory(parentId));
//        }

        @GetMapping("/categories/{slug}")
        public ResponseEntity<List<ProductListResponse>> getCategoryProductsBySlug(@PathVariable String slug) {
            return ResponseEntity.ok(productService.getProductByCategorySlug(slug));
        }
    }
