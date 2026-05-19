package com.example.websport.repository;

import com.example.websport.common.EnumStatus;
import com.example.websport.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepo extends JpaRepository<Product, Long> {
//    List<Product> findByCategoryIdAndTypeId(Long categoryId, Long typeId);

//    List<Product> findByCategoryId(Long categoryId);

//    List<Product> findByTypeId(Long typeId);

    //    List<Product> findByParentIdIn(Long id);

    List<Product> findByCategoryIdIn(List<Long> categoryIds);

}
