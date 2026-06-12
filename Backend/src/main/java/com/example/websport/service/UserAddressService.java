package com.example.websport.service;

import com.example.websport.dto.request.UserAddressReq;
import com.example.websport.dto.response.UserAddressRes;
import com.example.websport.entity.UserAddress;
import java.util.List;


public interface UserAddressService {
    UserAddressRes addAddress(Long userId, UserAddressReq req);

    List<UserAddressRes> getUserAddresses(Long userId);

    UserAddressRes updateAddress(Long userId, Long addressId, UserAddressReq req);

    void deleteAddress(Long userId, Long addressId);

    void setDefaultAddress(Long userId, Long addressId);
}
