package com.example.websport.dto.request;

import lombok.Data;

@Data
public class UpdateProfileReq {
    String username;
    String fullname;
    String phoneNumber;
    String address;
}
