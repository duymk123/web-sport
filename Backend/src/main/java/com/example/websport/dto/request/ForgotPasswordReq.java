package com.example.websport.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordReq {
    @NotBlank(message = "Vui long nhap username")
    private String username;
}
