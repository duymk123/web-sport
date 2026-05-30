package com.example.websport.dto.request;

import lombok.Data;

@Data
public class RegisterReq {
    private String fullname;
    private String username;
    private String password;
    private String phonenumber;
}
