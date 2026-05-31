package com.example.websport.service.impl;

import com.example.websport.common.EnumRole;
import com.example.websport.common.EnumStatus;
import com.example.websport.dto.request.ChangePasswordReq;
import com.example.websport.dto.request.LoginReq;
import com.example.websport.dto.request.RegisterReq;
import com.example.websport.dto.response.AuthResponse;
import com.example.websport.entity.User;
import com.example.websport.repository.UserRepo;
import com.example.websport.security.JwtUtils;
import com.example.websport.service.AuthService;
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
}
