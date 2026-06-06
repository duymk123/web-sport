package com.example.websport.controller;

import com.example.websport.dto.request.ProductCreateReq;
import com.example.websport.dto.request.ProductUpdateReq;
import com.example.websport.dto.request.VariantReq;
import com.example.websport.dto.response.ProductDetailResponse;
import com.example.websport.dto.response.ProductListResponse;
import com.example.websport.entity.Product;
import com.example.websport.service.ProductService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductService productService;


    @GetMapping("/all")
    public ResponseEntity<List<ProductListResponse>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }


    @GetMapping("/categories/{slug}")
    public ResponseEntity<Page<ProductListResponse>> getCategoryProductsBySlug(
            @PathVariable String slug,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "6") int pageSize
    ) {
        return ResponseEntity.ok(productService.getProductByCategorySlug(slug, categoryId, pageNumber, pageSize));
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

    @GetMapping("/filter")
    public ResponseEntity<List<ProductListResponse>> filter(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) String size,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice
    ){
        return ResponseEntity.ok(productService.filter(name, brand, size, minPrice, maxPrice));
    }

}
