package com.example.websport.service.impl;

import com.example.websport.dto.response.ProductListResponse;
import com.example.websport.entity.Category;
import com.example.websport.entity.Product;
import com.example.websport.repository.ProductRepo;
import com.example.websport.service.CategoryService;
import com.example.websport.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProductServiceImpl implements ProductService {

    @Autowired
    ProductRepo productRepo;

    @Autowired
    CategoryService categoryService;

    @Override
    public List<ProductListResponse> getAllProducts() {
        // 1. Lấy tất cả từ DB
        List<Product> products = productRepo.findAll();

        // 2. Chuyển sang DTO trả về
        return products.stream().map(p -> ProductListResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .brand(p.getBrand())
                // SỬA LẠI 2 DÒNG NÀY: Gọi thẳng hàm getCategoryId() và getTypeId()
                .categoryId(p.getCategoryId())
                .typeId(p.getTypeId())
                .startingPrice(0.0)
                .build()
        ).collect(Collectors.toList());
    }


    @Override
    public List<ProductListResponse> getProductsByParentCategory(Long parentId) {
        List<Long> categoryIdsToSearch = new ArrayList<>();
        categoryIdsToSearch.add(parentId);

        // Gọi qua CategoryService
        List<Category> childCategories = categoryService.getChildCategories(parentId);

        if (childCategories != null && !childCategories.isEmpty()) {
            for (Category child : childCategories) {
                categoryIdsToSearch.add(child.getId()); // Hết lỗi gạch đỏ ở đây
            }
        }

        List<Product> products = productRepo.findByCategoryIdIn(categoryIdsToSearch);
        return convertToDtoList(products);
    }

    @Override
    public List<ProductListResponse> getProductByCategorySlug(String Slug) {
        // 1. Nhờ CategoryService dịch từ "cau-long" sang Entity Danh Mục
        Category parentCategory = categoryService.getCategoryBySlug(Slug);

        // 2. Lấy ra ID thật của nó (ví dụ: số 1)
        Long parentId = parentCategory.getId();


        List<Long> categoryIdsToSearch = new ArrayList<>();
        categoryIdsToSearch.add(parentId);

        List<Category> childCategories = categoryService.getChildCategories(parentId);

        if (childCategories != null && !childCategories.isEmpty()) {
            for (Category child : childCategories) {
                categoryIdsToSearch.add(child.getId());
            }
        }

        List<Product> products = productRepo.findByCategoryIdIn(categoryIdsToSearch);
        return convertToDtoList(products);
    }

    private List<ProductListResponse> convertToDtoList(List<Product> products) {
        return products.stream().map(p -> ProductListResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .brand(p.getBrand())
                .categoryId(p.getCategoryId())
                .typeId(p.getTypeId())
                .startingPrice(0.0)
                .build()
        ).collect(Collectors.toList());
    }


//    @Override
//    public List<Product> getProducts(Long categoryId, Long typeId) {
//        List<Product> products;
//
//        if(categoryId != null && typeId != null ) {
//            products = productRepo.findByCategoryIdAndTypeId(categoryId, typeId);
//        }
//        else if(categoryId != null) {
//            products = productRepo.findByCatgory(categoryId);
//        }
//        else if(typeId != null) {
//            products = productRepo.findByTypeId(typeId);
//        }
//        else {
//            products = productRepo.findAll();
//        }
//        return products.stream().map(p -> ProductListResponse.builder()
//                .id(p.getId())
//                .name(p.getName())
//                .brand(p.getBrand())
//                .categoryId(p.getCategoryId())
//                .typeId(p.getCategoryId())
//                .startingPrice(0.0)).collect(Collectors.toList()); // Giá trị mặc định khi chưa có Variant
//    }
}
