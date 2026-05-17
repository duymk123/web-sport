package com.example.websport.service;

import com.example.websport.dto.response.ProductListResponse;
import com.example.websport.entity.Product;

import java.util.List;

public interface ProductService {
//    List<Product> getProducts(Long categoryId, Long typeId);

    List<ProductListResponse>   getAllProducts();

    // hàm lấy sản phẩm theo Danh mục cha
    List<ProductListResponse> getProductsByParentCategory(Long parentId);

    List<ProductListResponse> getProductByCategorySlug(String Slug);
}

