package com.example.websport.service;


import com.example.websport.dto.request.CouponApplyReq;
import com.example.websport.dto.request.CouponCreateReq;
import com.example.websport.dto.response.CouponApplyRes;
import com.example.websport.dto.response.CouponRes;

import java.util.List;

public interface CouponService {
    // Cho Customer
    CouponApplyRes applyCoupon(Long userId, CouponApplyReq req);
    List<CouponRes> getActiveCoupons();

    // Cho Admin
    CouponRes createCoupon(CouponCreateReq req);
    List<CouponRes> getAllCoupons();
    void toggleCouponStatus(Long id);
}
