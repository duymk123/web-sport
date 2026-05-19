package com.example.websport.controller;

import com.example.websport.dto.request.ProductCreateReq;
import com.example.websport.dto.request.ProductUpdateReq;
import com.example.websport.dto.request.VariantReq;
import com.example.websport.dto.response.ProductDetailResponse;
import com.example.websport.dto.response.ProductListResponse;
import com.example.websport.entity.Product;
import com.example.websport.service.ProductService;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {
    @Autowired
    private ProductService productService;


    @GetMapping
    public ResponseEntity<List<ProductListResponse>> getAllProducts() {
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

    //API tạo sản phẩm
    @Transactional
    @PostMapping
    public ResponseEntity<ProductListResponse> createProduct(@RequestBody ProductCreateReq request) {
        return ResponseEntity.ok(productService.createProduct(request));
    }

    //API sửa sản phẩm
    @Transactional
    @PutMapping("/{id}")
    public ResponseEntity<ProductListResponse> updateProduct(@PathVariable Long id,
                                                             @RequestBody ProductUpdateReq request) {
        return ResponseEntity.ok(productService.updateProduct(id, request));
    }

    // API Xóa sản phẩm
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok("Xóa sản phẩm thành công!");
    }

    //Thêm variants
    // API Thêm variants (Kích cỡ, Giá) cho sản phẩm
    @PostMapping("/{id}/variants")
    public ResponseEntity<String> addVariants(
            @PathVariable Long id,
            @RequestBody List<VariantReq> variants) {
        productService.addVariantsToProduct(id, variants);
        // Trả về thông báo thành công
        return ResponseEntity.ok("Thêm danh sách Kích cỡ / Giá thành công!");
    }

    @GetMapping("/{id}")
    ResponseEntity<ProductDetailResponse> getProduct(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductDetail(id));
    }
}
