package com.example.websport.dto.request;

import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
public class AddToCartReq implements Serializable {
    private Long variantId;
    private Integer quantity;
}
