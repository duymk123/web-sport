package com.example.websport.entity;

import com.example.websport.common.EnumStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "products")
@Builder
public class Product implements Serializable {
    @Id
    @Column(name = "id")
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "type_id")
    private Long typeId;

    @Column(name = "name")
    private String name;

    @Column(name = "brand")
    private String brand;

    @Column(name = "description", columnDefinition = "TEXT") //columnDefinition: khi Hibernate tạo bảng, nó sẽ tạo cột kiểu SQL là TEXT
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "specifications",columnDefinition = "json")
    private Map<String, Object> specifications;

    @Column(name = "status")
    private EnumStatus status;

    @OneToMany(mappedBy = "product")
    private List<ProductVariant> productVariants;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL)
    private List<ProductImage> productImages;



}
