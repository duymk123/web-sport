package com.example.websport.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.validator.constraints.Length;

import java.io.Serializable;

@Getter
@Setter
public class UserAddressReq implements Serializable {
    @NotBlank(message = "Tên người nhận không được bỏ trống")
    private String receiverName;

    @NotBlank(message = "Số điện thoại không được bỏ trống")
    @Length(min = 10, max = 20, message = "So dien thoai phai tu 10 den 20 ky tu")
    private String receiverPhone;

    @NotBlank(message = "Không được bỏ trống")
    private String city;

    @NotBlank(message = "Không được bỏ trống")
    private String district;

    @NotBlank(message = "Không được bỏ trống")
    private String detailAddress;

    private String addressType;

    private Boolean isDefault;
}
