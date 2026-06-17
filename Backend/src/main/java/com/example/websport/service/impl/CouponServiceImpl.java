package com.example.websport.service.impl;

import com.example.websport.dto.request.CouponApplyReq;
import com.example.websport.dto.request.CouponCreateReq;
import com.example.websport.dto.response.CouponApplyRes;
import com.example.websport.dto.response.CouponRes;
import com.example.websport.entity.Coupon;
import com.example.websport.common.DiscountType;
import com.example.websport.repository.CouponRepo;
import com.example.websport.repository.CouponUsageRepo;
import com.example.websport.service.CouponService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CouponServiceImpl implements CouponService {
    private final CouponRepo couponRepo;
    private final CouponUsageRepo couponUsageRepo;

    // ==========================================
    // LUỒNG CUSTOMER: ÁP DỤNG MÃ
    // ==========================================
    @Override
    public CouponApplyRes applyCoupon(Long userId, CouponApplyReq req) {
        Coupon coupon = couponRepo.findByCode(req.getCode())
                .orElseThrow(() -> new RuntimeException("Mã giảm giá không tồn tại!"));

        if (!coupon.getIsActive()) {
            throw new RuntimeException("Mã giảm giá này đã bị vô hiệu hóa!");
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(coupon.getStartDate())) {
            throw new RuntimeException("Mã giảm giá này chưa đến thời gian sử dụng!");
        }
        if (now.isAfter(coupon.getEndDate())) {
            throw new RuntimeException("Mã giảm giá này đã hết hạn!");
        }

        if (coupon.getUsageLimit() != null && coupon.getUsedCount() >= coupon.getUsageLimit()) {
            throw new RuntimeException("Mã giảm giá này đã hết lượt sử dụng!");
        }

        // Kiểm tra mỗi tài khoản chỉ được sử dụng voucher 1 lần
        if (couponUsageRepo.existsByUserIdAndCouponId(userId, coupon.getId())) {
            throw new RuntimeException("Bạn đã sử dụng mã giảm giá này rồi!");
        }

        double discountAmount = 0.0;

        if (coupon.getDiscountType() == DiscountType.FIXED) {
            discountAmount = coupon.getDiscountValue();
        } else if (coupon.getDiscountType() == DiscountType.PERCENT) {
            discountAmount = req.getOrderTotal() * (coupon.getDiscountValue() / 100);

            if (coupon.getMaxDiscountAmount() != null && discountAmount > coupon.getMaxDiscountAmount()) {
                discountAmount = coupon.getMaxDiscountAmount();
            }
        }

        if (discountAmount > req.getOrderTotal()) {
            discountAmount = req.getOrderTotal();
        }

        return CouponApplyRes.builder()
                .discountAmount(discountAmount)
                .finalTotal(req.getOrderTotal() - discountAmount)
                .message("Áp dụng mã giảm giá thành công!")
                .build();
    }

    // ==========================================
    // LUỒNG PUBLIC: LẤY COUPON ĐANG ACTIVE
    // ==========================================
    @Override
    public List<CouponRes> getActiveCoupons() {
        return couponRepo.findActiveCoupons(LocalDateTime.now())
                .stream()
                .map(this::mapToRes)
                .collect(Collectors.toList());
    }

    // ==========================================
    // LUỒNG ADMIN: QUẢN LÝ MÃ
    // ==========================================
    @Override
    public CouponRes createCoupon(CouponCreateReq req) {
        if (couponRepo.existsByCode(req.getCode())) {
            throw new RuntimeException("Mã code này đã tồn tại trong hệ thống!");
        }

        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw new RuntimeException("Ngày kết thúc không được nhỏ hơn ngày bắt đầu!");
        }

        Coupon newCoupon = Coupon.builder()
                .code(req.getCode().toUpperCase())
                .discountType(req.getDiscountType())
                .discountValue(req.getDiscountValue())
                .maxDiscountAmount(req.getMaxDiscountAmount())
                .usageLimit(req.getUsageLimit())
                .usedCount(0)
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .build();

        return mapToRes(couponRepo.save(newCoupon));
    }

    @Override
    public List<CouponRes> getAllCoupons() {
        return couponRepo.findAll().stream()
                .map(this::mapToRes)
                .collect(Collectors.toList());
    }

    @Override
    public void toggleCouponStatus(Long id) {
        Coupon coupon = couponRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy mã giảm giá!"));
        coupon.setIsActive(!coupon.getIsActive());
        couponRepo.save(coupon);
    }

    private CouponRes mapToRes(Coupon coupon) {
        return CouponRes.builder()
                .id(coupon.getId())
                .code(coupon.getCode())
                .discountType(coupon.getDiscountType())
                .discountValue(coupon.getDiscountValue())
                .maxDiscountAmount(coupon.getMaxDiscountAmount())
                .usageLimit(coupon.getUsageLimit())
                .usedCount(coupon.getUsedCount())
                .startDate(coupon.getStartDate())
                .endDate(coupon.getEndDate())
                .isActive(coupon.getIsActive())
                .build();
    }
}
