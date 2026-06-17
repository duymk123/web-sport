package com.example.websport.dto.request;

import com.example.websport.common.PaymentMethod;
import lombok.Getter;
import lombok.Setter;

import java.io.Serializable;
import java.util.List;

@Getter
@Setter
public class CheckoutReq implements Serializable {
    private Long addressId;              // ID của địa chỉ giao hàng khách đã chọn
    private PaymentMethod paymentMethod; // Khách chọn COD hay VNPAY?
    private String note;
    private List<String> couponCodes;    // Danh sách mã giảm giá (hỗ trợ nhiều mã)
}
