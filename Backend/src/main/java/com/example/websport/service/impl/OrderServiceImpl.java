package com.example.websport.service.impl;

import com.example.websport.common.DiscountType;
import com.example.websport.common.OrderStatus;
import com.example.websport.dto.request.CheckoutReq;
import com.example.websport.dto.request.OrderStatusReq;
import com.example.websport.dto.response.OrderRes;
import com.example.websport.entity.*;
import com.example.websport.repository.*;
import com.example.websport.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {
    private final OrderRepo orderRepo;
    private final UserRepo userRepo;
    private final UserAddressRepo addressRepo;
    private final CartRepo cartRepo;
    private final CartItemRepo cartItemRepo;
    private final ProductVariantRepo variantRepo;
    private final CouponRepo couponRepo;
    private final CouponUsageRepo couponUsageRepo;

    @Override
    @Transactional
    public OrderRes placeOrder(Long userId, CheckoutReq req) {
        // 1. Lấy thông tin User và Giỏ hàng
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy User"));

        Cart cart = cartRepo.findByUser_Id(userId)
                .orElseThrow(() -> new RuntimeException("Giỏ hàng trống!"));

        List<CartItem> cartItems = cartItemRepo.findByCart_Id(cart.getId());
        if (cartItems.isEmpty()) {
            throw new RuntimeException("Không có sản phẩm nào trong giỏ hàng để thanh toán!");
        }

        // 2. Lấy thông tin Địa chỉ giao hàng
        UserAddress address = addressRepo.findByIdAndUserId(req.getAddressId(), userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ giao hàng hợp lệ!"));

        // Gộp địa chỉ thành 1 chuỗi dài để lưu chết vào Order
        String fullAddress = address.getDetailAddress() + ", " + address.getDistrict() + ", " + address.getCity();

        // 3. Tạo Đơn hàng (Chưa lưu vội, phải tính tiền đã)
        Order newOrder = Order.builder()
                .user(user)
                .fullName(address.getReceiverName())
                .phoneNumber(address.getReceiverPhone())
                .shippingAddress(fullAddress)
                .paymentMethod(req.getPaymentMethod())
                .status(OrderStatus.PENDING) // Đơn mới luôn ở trạng thái Chờ xác nhận
                .note(req.getNote())
                .build();

        // 4. Xử lý từng món hàng: Trừ kho, Tính tổng tiền, Tạo OrderItem
        double totalAmount = 0.0;
        List<OrderItem> orderItems = new ArrayList<>();

        for (CartItem item : cartItems) {
            ProductVariant variant = item.getProductVariant();

            // KIỂM TRA KHO MỘT LẦN NỮA TRƯỚC KHI CHỐT
            if (variant.getStockQuantity() < item.getQuantity()) {
                throw new RuntimeException("Sản phẩm " + variant.getProduct().getName() + " không đủ số lượng tồn kho!");
            }

            // TRỪ KHO
            variant.setStockQuantity(variant.getStockQuantity() - item.getQuantity());
            variantRepo.save(variant);

            // TÍNH TIỀN VÀ TẠO CHI TIẾT ĐƠN HÀNG
            double priceAtPurchase = variant.getPrice().doubleValue();
            totalAmount += priceAtPurchase * item.getQuantity();

            OrderItem orderItem = OrderItem.builder()
                    .order(newOrder) // Móc vào Đơn hàng vừa tạo
                    .productVariant(variant)
                    .quantity(item.getQuantity())
                    .priceAtPurchase(priceAtPurchase) // Lưu chết giá lúc mua
                    .build();

            orderItems.add(orderItem);
        }

        // 5. Xử lý mã giảm giá (hỗ trợ nhiều mã)
        double totalDiscount = 0.0;
        List<String> appliedCodes = new ArrayList<>();

        if (req.getCouponCodes() != null && !req.getCouponCodes().isEmpty()) {
            double remainingTotal = totalAmount;

            for (String code : req.getCouponCodes()) {
                if (code == null || code.trim().isEmpty()) continue;
                String trimmedCode = code.trim().toUpperCase();

                // Kiểm tra không áp dụng trùng mã
                if (appliedCodes.contains(trimmedCode)) continue;

                Coupon coupon = couponRepo.findByCode(trimmedCode).orElse(null);
                if (coupon == null) continue;

                // Kiểm tra coupon hợp lệ
                if (!coupon.getIsActive()) continue;
                LocalDateTime now = LocalDateTime.now();
                if (now.isBefore(coupon.getStartDate()) || now.isAfter(coupon.getEndDate())) continue;
                if (coupon.getUsageLimit() != null && coupon.getUsedCount() >= coupon.getUsageLimit()) continue;

                // Kiểm tra mỗi tài khoản chỉ được sử dụng voucher 1 lần
                if (couponUsageRepo.existsByUserIdAndCouponId(userId, coupon.getId())) continue;

                // Tính giảm giá
                double discountAmount = 0.0;
                if (coupon.getDiscountType() == DiscountType.FIXED) {
                    discountAmount = coupon.getDiscountValue();
                } else if (coupon.getDiscountType() == DiscountType.PERCENT) {
                    discountAmount = remainingTotal * (coupon.getDiscountValue() / 100);
                    if (coupon.getMaxDiscountAmount() != null && discountAmount > coupon.getMaxDiscountAmount()) {
                        discountAmount = coupon.getMaxDiscountAmount();
                    }
                }

                if (discountAmount > remainingTotal) {
                    discountAmount = remainingTotal;
                }

                totalDiscount += discountAmount;
                remainingTotal -= discountAmount;
                appliedCodes.add(trimmedCode);

                // Tăng lượt sử dụng
                coupon.setUsedCount(coupon.getUsedCount() + 1);
                couponRepo.save(coupon);

                // Lưu lịch sử sử dụng coupon theo user
                couponUsageRepo.save(CouponUsage.builder()
                        .userId(userId)
                        .couponId(coupon.getId())
                        .build());

                if (remainingTotal <= 0) break;
            }
        }

        // 6. Cập nhật Tổng tiền và gán list items vào Order
        newOrder.setTotalAmount(totalAmount - totalDiscount);
        newOrder.setDiscountAmount(totalDiscount);
        newOrder.setCouponCodes(appliedCodes.isEmpty() ? null : String.join(",", appliedCodes));
        newOrder.setOrderItems(orderItems);

        // LƯU ĐƠN HÀNG XUỐNG DB (CascadeType.ALL sẽ tự động lưu luôn cả list orderItems)
        Order savedOrder = orderRepo.save(newOrder);

        // 7. XÓA SẠCH GIỎ HÀNG
        cartItemRepo.deleteAll(cartItems);

        // 8. Trả kết quả về
        return mapToRes(savedOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderRes> getMyOrders(Long userId) {
        return orderRepo.findByUser_IdOrderByCreatedAtDesc(userId)
                .stream().map(this::mapToRes).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderRes> getAllOrders() {
        return orderRepo.findAllByOrderByCreatedAtDesc()
                .stream().map(this::mapToRes).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public OrderRes adminUpdateStatus(Long orderId, OrderStatusReq req) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng #" + orderId));

        OrderStatus currentStatus = order.getStatus();
        OrderStatus newStatus = req.getStatus();

        // Validate workflow
        validateStatusTransition(currentStatus, newStatus);

        order.setStatus(newStatus);
        if (req.getNote() != null && !req.getNote().trim().isEmpty()) {
            String existingNote = order.getNote() != null ? order.getNote() + " | " : "";
            order.setNote(existingNote + "[Admin] " + req.getNote().trim());
        }

        return mapToRes(orderRepo.save(order));
    }

    @Override
    @Transactional
    public OrderRes userConfirmDelivered(Long userId, Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng #" + orderId));

        // Kiểm tra đơn hàng thuộc về user
        if (!order.getUser().getId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền thao tác đơn hàng này!");
        }

        // Chỉ cho phép xác nhận khi đang ở trạng thái SHIPPING
        if (order.getStatus() != OrderStatus.SHIPPING) {
            throw new RuntimeException("Chỉ có thể xác nhận nhận hàng khi đơn đang giao!");
        }

        order.setStatus(OrderStatus.DELIVERED);
        String existingNote = order.getNote() != null ? order.getNote() + " | " : "";
        order.setNote(existingNote + "[User] Đã xác nhận nhận hàng");

        return mapToRes(orderRepo.save(order));
    }

    // ==========================================
    // VALIDATE WORKFLOW TRẠNG THÁI
    // ==========================================
    private void validateStatusTransition(OrderStatus current, OrderStatus next) {
        boolean valid = false;

        switch (current) {
            case PENDING:
                // PENDING -> CONFIRMED hoặc CANCELLED
                valid = (next == OrderStatus.CONFIRMED || next == OrderStatus.CANCELLED);
                break;
            case CONFIRMED:
                // CONFIRMED -> SHIPPING
                valid = (next == OrderStatus.SHIPPING);
                break;
            case SHIPPING:
                // SHIPPING -> DELIVERED hoặc FAILED
                valid = (next == OrderStatus.DELIVERED || next == OrderStatus.FAILED);
                break;
            case DELIVERED:
            case FAILED:
            case CANCELLED:
                // Các trạng thái cuối, không thể chuyển tiếp
                valid = false;
                break;
        }

        if (!valid) {
            throw new RuntimeException(
                    "Không thể chuyển trạng thái từ " + current + " sang " + next + "!"
            );
        }
    }

    // Hàm phụ nặn DTO
    private OrderRes mapToRes(Order order) {
        List<OrderRes.OrderItemRes> itemResList = new ArrayList<>();
        if (order.getOrderItems() != null) {
            for (OrderItem item : order.getOrderItems()) {
                ProductVariant variant = item.getProductVariant();
                String productName = variant.getProduct() != null ? variant.getProduct().getName() : "";
                String imageUrl = "";
                if (variant.getProduct() != null && variant.getProduct().getProductImages() != null
                        && !variant.getProduct().getProductImages().isEmpty()) {
                    imageUrl = variant.getProduct().getProductImages().get(0).getImageUrl();
                }

                itemResList.add(OrderRes.OrderItemRes.builder()
                        .id(item.getId())
                        .productName(productName)
                        .color(variant.getColor())
                        .size(variant.getSize())
                        .quantity(item.getQuantity())
                        .priceAtPurchase(item.getPriceAtPurchase())
                        .imageUrl(imageUrl)
                        .build());
            }
        }

        return OrderRes.builder()
                .id(order.getId())
                .fullName(order.getFullName())
                .phoneNumber(order.getPhoneNumber())
                .shippingAddress(order.getShippingAddress())
                .totalAmount(order.getTotalAmount())
                .paymentMethod(order.getPaymentMethod())
                .status(order.getStatus())
                .note(order.getNote())
                .couponCodes(order.getCouponCodes())
                .discountAmount(order.getDiscountAmount())
                .userName(order.getUser() != null ? order.getUser().getUsername() : "")
                .items(itemResList)
                .createdAt(order.getCreatedAt())
                .build();
    }
}
