package com.example.websport.dto.request;

import lombok.Data;

@Data
public class ResetPasswordReq {
    private String token;
    private String newPassword;
}
