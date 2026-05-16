package com.example.websport.service.impl;

import com.example.websport.entity.ProductType;
import com.example.websport.repository.ProductTypeRepo;
import com.example.websport.service.ProductTypeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProductTypeServiceImpl implements ProductTypeService {
    @Autowired
    private ProductTypeRepo productTypeRepo;

    @Override
    public List<ProductType> findAll() {
        return productTypeRepo.findAll();
    }
}
