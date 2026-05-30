package com.example.websport.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtUtils {
    // Tự động lấy giá trị từ dòng jwt.secret trong file yaml
    @Value("${jwt.secret}")
    private String jwtSecret;

    // Tự động lấy giá trị từ dòng jwt.expiration trong file yaml
    @Value("${jwt.expiration}")
    private long jwtExpiration;

    // Hàm 1: Chế tạo Token từ Username
    public String generateToken(String username) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        return Jwts.builder()
                .setSubject(username) // Nhét username vào ruột Token
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(SignatureAlgorithm.HS512, jwtSecret) // Ký bằng khóa lấy từ yaml
                .compact();
    }

    // Hàm 2: Dịch ngược Token ra lại thành Username
    public String getUsernameFromToken(String token) {
        return Jwts.parser()
                .setSigningKey(jwtSecret)
                .parseClaimsJws(token)
                .getBody()
                .getSubject(); // Lấy username ra
    }

    // Hàm 3: Kiểm tra xem Token này có hợp lệ không
    public boolean validateToken(String authToken) {
        try {
            Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(authToken);
            return true;
        } catch (Exception ex) {
            System.out.println("Lỗi xác thực Token: " + ex.getMessage());
            return false;
        }
    }
}
