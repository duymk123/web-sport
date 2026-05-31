package com.example.websport.service;

import com.example.websport.dto.request.ChangePasswordReq;
import com.example.websport.dto.request.LoginReq;
import com.example.websport.dto.request.RegisterReq;
import com.example.websport.dto.response.AuthResponse;

public interface AuthService {
    String register(RegisterReq req);
    AuthResponse login(LoginReq req);
    String ChangePassword(ChangePasswordReq req);
}
