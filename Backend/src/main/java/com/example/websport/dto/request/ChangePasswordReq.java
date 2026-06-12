package com.example.websport.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordReq {
    @NotBlank(message = "Vui long nhap du thong tin")
    String username;

    @NotBlank(message = "vui long nhap oldPassword")
    String oldPassword;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, max = 20, message = "Mật khẩu phải từ 8 đến 20 ký tự")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).*$",
            message = "Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt"
    )
    String newPassword;
}
