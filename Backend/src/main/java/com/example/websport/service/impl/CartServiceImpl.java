package com.example.websport.service.impl;

import com.example.websport.dto.request.AddToCartReq;
import com.example.websport.dto.response.CartItemRes;
import com.example.websport.dto.response.CartRes;
import com.example.websport.entity.Cart;
import com.example.websport.entity.CartItem;
import com.example.websport.entity.ProductVariant;
import com.example.websport.entity.User;
import com.example.websport.repository.CartItemRepo;
import com.example.websport.repository.CartRepo;
import com.example.websport.repository.ProductVariantRepo;
import com.example.websport.repository.UserRepo;
import com.example.websport.service.CartService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {
    private final CartRepo cartRepo;
    private final CartItemRepo cartItemRepo;
    private final UserRepo userRepo;
    private final ProductVariantRepo variantRepo; // Giả sử bạn đã có Repo này

    // Hàm phụ: Lấy giỏ hàng, nếu chưa có thì tự động tạo mới
    private Cart getOrCreateCart(Long userId) {
        return cartRepo.findByUser_Id(userId).orElseGet(() -> {
            User user = userRepo.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy User"));
            Cart newCart = Cart.builder().user(user).build();
            return cartRepo.save(newCart);
        });
    }

    @Override
    public CartRes getMyCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        List<CartItem> items = cartItemRepo.findByCart_Id(cart.getId());

        double totalPrice = 0.0;
        List<CartItemRes> itemResList = items.stream().map(item -> {
            ProductVariant variant = item.getProductVariant();
            // Lấy giá trị thực tế từ BigDecimal price
            double price = variant.getPrice() != null ? variant.getPrice().doubleValue() : 0.0;
            double subTotal = price * item.getQuantity();

            // Lấy ảnh đầu tiên từ danh sách ảnh của sản phẩm
            String imageUrl = (variant.getProduct().getProductImages() != null
                    && !variant.getProduct().getProductImages().isEmpty())
                    ? variant.getProduct().getProductImages().get(0).getImageUrl()
                    : null;

            return CartItemRes.builder()
                    .cartItemId(item.getId())
                    .variantId(variant.getId())
                    .productId(variant.getProduct().getId())
                    .productName(variant.getProduct().getName())
                    .color(variant.getColor())
                    .size(variant.getSize())
                    .imageUrl(imageUrl)
                    .price(price)
                    .quantity(item.getQuantity())
                    .subTotal(subTotal)
                    .build();
        }).collect(Collectors.toList());

        // Tính tổng tiền giỏ hàng
        for (CartItemRes item : itemResList) {
            totalPrice += item.getSubTotal();
        }

        return CartRes.builder()
                .cartId(cart.getId())
                .items(itemResList)
                .totalPrice(totalPrice)
                .build();
    }

    @Override
    @Transactional
    public CartRes addToCart(Long userId, AddToCartReq req) {
        Cart cart = getOrCreateCart(userId);

        ProductVariant variant = variantRepo.findById(req.getVariantId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy sản phẩm"));

        // Kiểm tra xem món này đã có trong giỏ chưa
        Optional<CartItem> existingItemOpt = cartItemRepo.findByCart_IdAndProductVariant_Id(cart.getId(), variant.getId());

        if (existingItemOpt.isPresent()) {
            // ĐÃ CÓ: Cộng dồn số lượng
            CartItem existingItem = existingItemOpt.get();
            int newQuantity = existingItem.getQuantity() + req.getQuantity();

            // Kiểm tra tồn kho
            if (newQuantity > variant.getStockQuantity()) {
                throw new RuntimeException("Số lượng vượt quá tồn kho. Chỉ còn " + variant.getStockQuantity() + " sản phẩm.");
            }

            existingItem.setQuantity(newQuantity);
            cartItemRepo.save(existingItem);
        } else {
            // CHƯA CÓ: Tạo mới
            if (req.getQuantity() > variant.getStockQuantity()) {
                throw new RuntimeException("Số lượng vượt quá tồn kho. Chỉ còn " + variant.getStockQuantity() + " sản phẩm.");
            }

            CartItem newItem = CartItem.builder()
                    .cart(cart)
                    .productVariant(variant)
                    .quantity(req.getQuantity())
                    .build();
            cartItemRepo.save(newItem);
        }

        // Trả về giỏ hàng mới nhất
        return getMyCart(userId);
    }

    @Override
    @Transactional
    public CartRes updateItemQuantity(Long userId, Long cartItemId, Integer quantity) {
        CartItem item = cartItemRepo.findById(cartItemId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy món hàng trong giỏ"));

        // Bảo mật: Đảm bảo món hàng này thực sự thuộc về giỏ của user đang request
        if (!item.getCart().getUser().getId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền sửa giỏ hàng này");
        }

        if (quantity <= 0) {
            cartItemRepo.delete(item); // Nếu sửa về 0 thì coi như xóa
        } else {
            if (quantity > item.getProductVariant().getStockQuantity()) {
                throw new RuntimeException("Số lượng vượt quá tồn kho.");
            }
            item.setQuantity(quantity);
            cartItemRepo.save(item);
        }

        return getMyCart(userId);
    }

    @Override
    @Transactional
    public CartRes removeCartItem(Long userId, Long cartItemId) {
        CartItem item = cartItemRepo.findById(cartItemId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy món hàng trong giỏ"));

        if (!item.getCart().getUser().getId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền xóa!");
        }

        cartItemRepo.delete(item);
        return getMyCart(userId);
    }

    @Override
    @Transactional
    public void clearCart(Long userId) {
        Cart cart = getOrCreateCart(userId);
        List<CartItem> items = cartItemRepo.findByCart_Id(cart.getId());
        cartItemRepo.deleteAll(items);
    }
}
