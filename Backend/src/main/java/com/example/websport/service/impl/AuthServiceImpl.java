package com.example.websport.service.impl;

import com.example.websport.common.EnumRole;
import com.example.websport.common.EnumStatus;
import com.example.websport.dto.request.*;
import com.example.websport.dto.response.AuthResponse;
import com.example.websport.entity.PasswordReset;
import com.example.websport.entity.User;
import com.example.websport.repository.PasswordResetRepo;
import com.example.websport.repository.UserRepo;
import com.example.websport.security.JwtUtils;
import com.example.websport.service.AuthService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepo userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final PasswordResetRepo passwordResetRepo;

    @Override
    public String register(RegisterReq req) {
        if (userRepo.findByUsername(req.getUsername()).isPresent()) {
            throw new RuntimeException("Username is already in use");
        }
        User newUser = User.builder()
                .fullname(req.getFullname())
                .username(req.getUsername())
                .password(passwordEncoder.encode(req.getPassword()))
                .phoneNumber(req.getPhonenumber())
                .role(EnumRole.CUSTOMER)
                .status(EnumStatus.ACTIVE)
                .build();
        userRepo.save(newUser);
        return "Register successfully";

    }

    @Override
    public AuthResponse login(LoginReq req) {

        User user = userRepo.findByUsername(req.getUsername())
                .orElseThrow(() -> new RuntimeException("Incorrect username or password"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new RuntimeException("Incorrect username or password");
        }

        if (user.getStatus() == EnumStatus.ACTIVE) {
            throw new RuntimeException("User is locked");
        }

        String token = jwtUtils.generateToken(user.getUsername());

        return AuthResponse.builder()
                .token(token)
                .role(user.getRole().name())
                .fullName(user.getFullname())
                .build();

    }

    @Override
    public String ChangePassword(ChangePasswordReq req) {
        // 1. Tìm user dưới Database
        User user = userRepo.findByUsername(req.getUsername())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));

        // 2. Xác thực mật khẩu cũ: Dùng .matches() để so sánh chữ khách gõ với chuỗi băm trong DB
        if (!passwordEncoder.matches(req.getOldPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu cũ không chính xác!");
        }

        // 3. Nếu khớp -> Tiến hành băm mật khẩu mới bằng .encode() và cập nhật
        user.setPassword(passwordEncoder.encode(req.getNewPassword()));

        // 4. Lưu lại xuống Database
        userRepo.save(user);

        return "Đổi mật khẩu thành công!";
    }

    @Override
    @Transactional
    public String forgotPassword(ForgotPasswordReq req) {
        User user = userRepo.findByUsername(req.getUsername())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));

        // Cập nhật: Truyền object user vào hàm xóa
        passwordResetRepo.deleteByUser(user);

        String token = java.util.UUID.randomUUID().toString();

        PasswordReset resetToken = PasswordReset.builder()
                .user(user) // Cập nhật: Gán nguyên object User vào thay vì user.getId()
                .resetToken(token)
                .expiresAt(java.time.LocalDateTime.now().plusMinutes(15))
                .build();

        passwordResetRepo.save(resetToken);

        return "Mã khôi phục của bạn là: " + token;
    }

    @Override
    public String resetPassword(ResetPasswordReq req) {
        PasswordReset resetToken = passwordResetRepo.findByResetToken(req.getToken())
                .orElseThrow(() -> new RuntimeException("Mã khôi phục không hợp lệ!"));

        if (resetToken.getExpiresAt().isBefore(java.time.LocalDateTime.now())) {
            passwordResetRepo.delete(resetToken);
            throw new RuntimeException("Mã khôi phục đã hết hạn!");
        }


        // Không cần chọc xuống UserRepository để tìm lại User
        // JPA tự động lấy User thông qua khóa ngoại
        User user = resetToken.getUser();

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepo.save(user);

        passwordResetRepo.delete(resetToken);

        return "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.";
    }
}
