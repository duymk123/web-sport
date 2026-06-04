package com.example.websport.security;

import com.example.websport.entity.User;
import com.example.websport.repository.UserRepo;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final UserRepo userRepo;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // 1. Lấy Token từ Header của HTTP Request
            String header = request.getHeader("Authorization");
            String token = null;

            // Theo chuẩn quốc tế, Token luôn bắt đầu bằng chữ "Bearer "
            if (header != null && header.startsWith("Bearer ")) {
                token = header.substring(7); // Cắt bỏ chữ "Bearer " để lấy lõi Token
            }

            // 2. Nếu có Token và Token là hàng thật
            if (token != null && jwtUtils.validateToken(token)) {

                // 3. Dịch ngược Token để lấy Username
                String username = jwtUtils.getUsernameFromToken(token);

                // 4. Tìm kiếm người dùng trong Database
                User user = userRepo.findByUsername(username).orElse(null);

                if (user != null) {
                    // 5. Cấp quyền (ADMIN hoặc USER) dựa vào Database
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority(user.getRole().name());

                    // 6. Báo cáo với Spring Security: "Xác thực thành công, mở cửa cho qua!"
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            user, null, Collections.singletonList(authority));
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception e) {
            System.out.println("Không thể thiết lập xác thực người dùng: " + e.getMessage());
        }

        // Cho phép Request đi tiếp đến các Controller
        filterChain.doFilter(request, response);
    }
}