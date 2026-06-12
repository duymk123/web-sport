package com.example.websport.service;

import com.example.websport.dto.request.*;
import com.example.websport.dto.response.AuthResponse;

public interface AuthService {

    String register(RegisterReq req);
    AuthResponse login(LoginReq req);

    String ChangePassword(ChangePasswordReq req);
    String forgotPassword(ForgotPasswordReq req);
    String resetPassword(ResetPasswordReq req);

    AuthResponse updateProfile(UpdateProfileReq req);
    AuthResponse getProfile(String username);
}
