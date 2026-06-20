package com.example.websport.service.impl;

import com.example.websport.common.OrderStatus;
import com.example.websport.dto.request.ProductReviewCreateReq;
import com.example.websport.dto.response.ProductReviewRes;
import com.example.websport.entity.Order;
import com.example.websport.entity.Product;
import com.example.websport.entity.ProductReview;
import com.example.websport.entity.User;
import com.example.websport.repository.OrderItemRepo;
import com.example.websport.repository.OrderRepo;
import com.example.websport.repository.ProductRepo;
import com.example.websport.repository.ProductReviewRepo;
import com.example.websport.repository.UserRepo;
import com.example.websport.service.ProductReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductReviewServiceImpl implements ProductReviewService {
    private final ProductReviewRepo productReviewRepo;
    private final OrderRepo orderRepo;
    private final ProductRepo productRepo;
    private final UserRepo userRepo;
    private final OrderItemRepo orderItemRepo;

    @Override
    @Transactional
    public ProductReviewRes createReview(Long userId, ProductReviewCreateReq req) {
        validateCreateReq(req);

        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay User"));

        Order order = orderRepo.findById(req.getOrderId())
                .orElseThrow(() -> new RuntimeException("Khong tim thay don hang #" + req.getOrderId()));

        if (!order.getUser().getId().equals(userId)) {
            throw new RuntimeException("Ban khong co quyen danh gia don hang nay!");
        }
        if (order.getStatus() != OrderStatus.DELIVERED) {
            throw new RuntimeException("Chi co the danh gia san pham khi don hang da giao thanh cong!");
        }
        if (!orderItemRepo.existsByOrder_IdAndProductVariant_Product_Id(order.getId(), req.getProductId())) {
            throw new RuntimeException("San pham nay khong nam trong don hang da mua!");
        }
        if (productReviewRepo.existsByUser_IdAndProduct_IdAndOrder_Id(userId, req.getProductId(), order.getId())) {
            throw new RuntimeException("Ban da danh gia san pham nay trong don hang nay!");
        }

        Product product = productRepo.findById(req.getProductId())
                .orElseThrow(() -> new RuntimeException("Khong tim thay san pham #" + req.getProductId()));

        ProductReview review = ProductReview.builder()
                .user(user)
                .product(product)
                .order(order)
                .rating(req.getRating())
                .comment(req.getComment() != null ? req.getComment().trim() : null)
                .build();

        return mapToRes(productReviewRepo.save(review));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductReviewRes> getMyReviews(Long userId) {
        return productReviewRepo.findByUser_IdOrderByCreatedAtDesc(userId)
                .stream().map(this::mapToRes).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductReviewRes> getReviewsByOrder(Long userId, Long orderId) {
        Order order = orderRepo.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Khong tim thay don hang #" + orderId));
        if (!order.getUser().getId().equals(userId)) {
            throw new RuntimeException("Ban khong co quyen xem danh gia cua don hang nay!");
        }

        return productReviewRepo.findByOrder_IdOrderByCreatedAtDesc(orderId)
                .stream().map(this::mapToRes).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductReviewRes> getReviewsByProduct(Long productId) {
        return productReviewRepo.findByProduct_IdOrderByCreatedAtDesc(productId)
                .stream().map(this::mapToRes).collect(Collectors.toList());
    }

    private void validateCreateReq(ProductReviewCreateReq req) {
        if (req.getOrderId() == null) {
            throw new RuntimeException("Vui long chon don hang can danh gia!");
        }
        if (req.getProductId() == null) {
            throw new RuntimeException("Vui long chon san pham can danh gia!");
        }
        if (req.getRating() == null || req.getRating() < 1 || req.getRating() > 5) {
            throw new RuntimeException("So sao danh gia phai tu 1 den 5!");
        }
    }

    private ProductReviewRes mapToRes(ProductReview review) {
        return ProductReviewRes.builder()
                .id(review.getId())
                .userId(review.getUser() != null ? review.getUser().getId() : null)
                .username(review.getUser() != null ? review.getUser().getUsername() : "")
                .productId(review.getProduct() != null ? review.getProduct().getId() : null)
                .productName(review.getProduct() != null ? review.getProduct().getName() : "")
                .orderId(review.getOrder() != null ? review.getOrder().getId() : null)
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
