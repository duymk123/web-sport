package com.example.websport.repository;

import com.example.websport.entity.UserAddress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserAddressRepo extends JpaRepository<UserAddress, Long> {
    //lay address cua 1 user
    List<UserAddress> findByUserId(Long userId);

    // Tìm 1 địa chỉ cụ thể ĐẢM BẢO thuộc về đúng user đó
    Optional<UserAddress> findByIdAndUserId(Long id, Long userId);
}
