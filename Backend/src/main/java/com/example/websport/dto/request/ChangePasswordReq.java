package com.example.websport.dto.request;

import lombok.Data;

@Data
public class ChangePasswordReq {
    String username;
    String oldPassword;
    String newPassword;
}
