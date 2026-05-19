package com.example.websport.repository;

import com.example.websport.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductVariantRepo extends JpaRepository<ProductVariant, Long> {
}
