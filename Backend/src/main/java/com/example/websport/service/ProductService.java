package com.example.websport.service;

import com.example.websport.dto.request.ProductCreateReq;
import com.example.websport.dto.request.ProductUpdateReq;
import com.example.websport.dto.request.VariantReq;
import com.example.websport.dto.response.ProductDetailResponse;
import com.example.websport.dto.response.ProductListResponse;
import com.example.websport.entity.Product;

import java.util.List;

public interface ProductService {
//    List<Product> getProducts(Long categoryId, Long typeId);

    List<ProductListResponse>   getAllProducts();

    // hàm lấy sản phẩm theo Danh mục cha
    List<ProductListResponse> getProductsByParentCategory(Long parentId);

    List<ProductListResponse> getProductByCategorySlug(String Slug);

    ProductListResponse createProduct(ProductCreateReq request);
    ProductListResponse updateProduct(Long id, ProductUpdateReq request);
    void deleteProduct(Long id);

    ProductDetailResponse getProductDetail(Long id);

    // Khai báo hàm thêm Biến thể
    void addVariantsToProduct(Long productId, List<VariantReq> variantReqs);

    // Hàm filter và search
    List<ProductListResponse> filter(String name, String brand, String size, Double minPrice, Double maxPrice);




}

