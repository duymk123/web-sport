package com.example.websport.service;


import com.example.websport.entity.Category;
import org.springframework.stereotype.Service;

import java.util.List;


public interface CategoryService {
    List<Category> getAll();
    List<Category> findByParentIsNull();

    // Thêm hàm lấy danh mục con
    List<Category> getChildCategories(Long parentId);

    Category create(Category category);

    Category getCategoryBySlug(String slug);
}
