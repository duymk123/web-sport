package com.example.websport.repository;

import com.example.websport.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepo extends JpaRepository<Category, Long> {
    List<Category> findByParentIsNull();
    List<Category> findByParentId(Long id);
    Optional<Category> findBySlug(String slug);

//    List<Category> Slug(String slug);
}
