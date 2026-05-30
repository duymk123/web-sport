package com.example.websport.repository;

import com.example.websport.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepo extends JpaRepository<User, Long> {

    // Tìm người dùng bằng username ( Dùng cho đăng nhập )
    Optional<User> findByUsername(String username);

    // Kiểm tra username đã tồn tại chưa ( Dùng cho lúc đăng kí)
    boolean existsByUsername(String username);
}
