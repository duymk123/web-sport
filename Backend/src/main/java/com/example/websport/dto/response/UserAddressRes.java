package com.example.websport.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class UserAddressRes {
    private Long id;
    private String receiverName;
    private String receiverPhone;
    private String city;
    private String district;
    private String detailAddress;
    private String addressType;
    private Boolean isDefault;
}
