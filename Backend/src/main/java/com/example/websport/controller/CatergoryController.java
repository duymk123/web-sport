package com.example.websport.controller;

import com.example.websport.entity.Category;
import com.example.websport.service.CategoryService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
public class CatergoryController {
    @Autowired
    private CategoryService categoryService;

    @GetMapping //Lấy ra danh mục
    public ResponseEntity<List<Category>> getAllCategories(){
        List<Category> categories = categoryService.getAll();
        return ResponseEntity.ok(categories);
    }

    @GetMapping("/tree") // Lấy ra (Cầu lông | Bóng đá | Pickle)
    public ResponseEntity<List<Category>> getAllCategoriesByTree(){
        List<Category> tree = categoryService.findByParentIsNull();
        return ResponseEntity.ok(tree);
    }

    @PostMapping("/categories")
    public ResponseEntity<Category> createCategory(@RequestBody Category category){
        Category createCateGory = categoryService.create(category);
        return ResponseEntity.ok(createCateGory);
    }
}
