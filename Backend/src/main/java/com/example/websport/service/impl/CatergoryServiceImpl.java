package com.example.websport.service.impl;

import com.example.websport.entity.Category;
import com.example.websport.repository.CategoryRepo;
import com.example.websport.service.CategoryService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CatergoryServiceImpl implements CategoryService {
    @Autowired
    private CategoryRepo categoryRepo;


    @Override
    public List<Category> getAll() {

        return categoryRepo.findAll();
    }

    @Override
    public List<Category> findByParentIsNull() {
        return categoryRepo.findByParentIsNull();
    }

    @Override
    public List<Category> getChildCategories(Long parentId) {
        return categoryRepo.findByParentId(parentId);
    }

    @Override
    public Category create(Category category) {
        if (category.getName() == null && category.getSlug() == null) {
            throw new RuntimeException("Category name and slug cannot be null");
        }
        return categoryRepo.save(category);
    }

    @Override
    public Category getCategoryBySlug(String slug) {
        return categoryRepo.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Category not found" + slug));
    }
}

