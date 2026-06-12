package com.example.websport.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Áp dụng cấu hình này cho tất cả các API trong dự án (/api/v1/products,...)
                .allowedOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:3001") // Cho phép Frontend truy cập
                .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS") // Các phương thức HTTP được phép gọi sang Backend
                .allowedHeaders("*") // Cho phép truyền mọi loại Header dữ liệu (như Content-Type, Authorization...)
                .allowCredentials(true); // Cho phép Frontend gửi kèm Cookie hoặc Token xác thực (nếu có)
    }

}
