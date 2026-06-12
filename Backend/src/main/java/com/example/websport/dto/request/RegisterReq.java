package com.example.websport.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import org.hibernate.validator.constraints.Length;

import java.io.Serializable;

@Data
public class RegisterReq implements Serializable {
    @NotBlank(message = "Vui long dien dung thong tin")
    @Length(min = 5, max = 100)
    private String fullname;

    @NotBlank(message = "vui long dien dung thong tin")
    @Length(min = 3, max = 100)
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 8, max = 20, message = "Mật khẩu phải từ 8 đến 20 ký tự")
    @Pattern(
            regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).*$",
            message = "Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt"
    )
    private String password;

    @NotBlank(message = "Mat khau khong duoc de trong")
    @Size(min = 10)
    private String phonenumber;
}
