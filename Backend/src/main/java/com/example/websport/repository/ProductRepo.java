package com.example.websport.repository;

import com.example.websport.common.EnumStatus;
import com.example.websport.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepo extends JpaRepository<Product, Long> {
//    List<Product> findByCategoryIdAndTypeId(Long categoryId, Long typeId);

//    List<Product> findByCategoryId(Long categoryId);

//    List<Product> findByTypeId(Long typeId);

    //    List<Product> findByParentIdIn(Long id);



    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN p.productVariants v WHERE " +
            "(:name IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :name, '%'))) AND " +
            "(:brand IS NULL OR LOWER(p.brand) = LOWER(:brand)) AND " +
            "(:size IS NULL OR v.size = :size) AND " +
            "(:minPrice IS NULL OR v.price >= :minPrice) AND " +
            "(:maxPrice IS NULL OR v.price <= :maxPrice)")
    List<Product> searchAndFilterProducts(
            @Param("name") String name,
            @Param("brand") String brand,
            @Param("size") String size,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice);

    Page<Product> findByCategoryIdIn(List<Long> categoryIds, Pageable pageable);

    List<Product> findByCategoryIdIn(List<Long> categoryIds);
}

