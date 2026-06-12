package com.example.websport.config;

import com.example.websport.security.JwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    // 1. Cấu hình công cụ băm mật khẩu (BCrypt)
    @Bean
    public PasswordEncoder passwordEncoder() {

        return new BCryptPasswordEncoder();
    }

    // 2. Cấu hình phân luồng, cấp quyền cho từng API
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(org.springframework.security.config.Customizer.withDefaults()) // Kích hoạt CORS trong Security
                .csrf(csrf -> csrf.disable()) // Tắt CSRF bảo vệ mặc định
                .formLogin(form -> form.disable()) // Tắt form login mặc định (dùng JWT)
                .httpBasic(basic -> basic.disable()) // Tắt HTTP Basic auth
                .sessionManagement(session -> session
                        .sessionCreationPolicy(org.springframework.security.config.http.SessionCreationPolicy.STATELESS)) // Stateless cho REST API
                .authorizeHttpRequests(auth -> auth

                        // ==========================================
                        // LUỒNG 1: MỞ CỬA TỰ DO (Khách không cần đăng nhập vẫn xem được)
                        // ==========================================
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll() // Cổng Đăng nhập & Đăng ký

                        .requestMatchers(HttpMethod.GET, "/api/v1/products/**").permitAll()     // Xem sản phẩm
                        .requestMatchers(HttpMethod.GET, "/api/v1/categories/**").permitAll()   // Xem danh mục
                        .requestMatchers(HttpMethod.GET, "/api/v1/product-types/**").permitAll()// Xem loại sản phẩm


                        // ==========================================
                        // LUỒNG 2: KHU VỰC CỦA ADMIN (Chỉ quyền ADMIN mới được sửa dữ liệu)
                        // ==========================================
                        // Đối với Sản phẩm
                        .requestMatchers(HttpMethod.POST, "/api/v1/products/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/products/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/products/**").hasAuthority("ADMIN")

                        // Đối với Danh mục (Categories)
                        .requestMatchers(HttpMethod.POST, "/api/v1/categories/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/categories/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/categories/**").hasAuthority("ADMIN")

                        // Đối với Loại sản phẩm (Product Types)
                        .requestMatchers(HttpMethod.POST, "/api/v1/product-types/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/product-types/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/product-types/**").hasAuthority("ADMIN")


                        // ==========================================
                        // LUỒNG 3: CÁC YÊU CẦU CÒN LẠI (Giỏ hàng, Hồ sơ...)
                        // ==========================================
                        // Bất kỳ ai (USER hay ADMIN) miễn là có đăng nhập (có Token) thì mới được qua

                        //Luồng address
                        .requestMatchers(HttpMethod.GET, "/api/v1/addresses", "/api/v1/addresses/**").hasAnyAuthority("ADMIN", "CUSTOMER")
                        .requestMatchers(HttpMethod.POST, "/api/v1/addresses", "/api/v1/addresses/**").hasAnyAuthority("ADMIN", "CUSTOMER")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/addresses", "/api/v1/addresses/**").hasAnyAuthority("ADMIN", "CUSTOMER")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/addresses", "/api/v1/addresses/**").hasAnyAuthority("ADMIN", "CUSTOMER")
                        .requestMatchers(HttpMethod.PATCH, "/api/v1/addresses", "/api/v1/addresses/**").hasAnyAuthority("ADMIN", "CUSTOMER")

                        .anyRequest().authenticated()
                );
//        JwtFilter chặn ngay trước cổng kiểm tra Username/Password mặc định
        http.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
