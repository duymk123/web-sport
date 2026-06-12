package com.example.websport.service.impl;

import com.example.websport.dto.request.UserAddressReq;
import com.example.websport.dto.response.UserAddressRes;
import com.example.websport.entity.User;
import com.example.websport.entity.UserAddress;
import com.example.websport.exception.NotFoundException;
import com.example.websport.repository.UserAddressRepo;
import com.example.websport.repository.UserRepo;
import com.example.websport.service.UserAddressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserAddressServiceImpl implements UserAddressService {
    private final UserAddressRepo userAddressRepo;
    private final UserRepo userRepo;

    private void removeOldDefaultAddress(List<UserAddress> addresses) {
        for (UserAddress a : addresses) {
            if (a.isDefault()) {
                a.setDefault(false);
                userAddressRepo.save(a);
            }
        }
    }

    private UserAddressRes mapToRes(UserAddress address) {
        return UserAddressRes.builder()
                .id(address.getId())
                .receiverName(address.getReceiverName())
                .receiverPhone(address.getReceiverPhone())
                .detailAddress(address.getDetailAddress())
                .addressType(address.getAddressType())
                .city(address.getCity())
                .district(address.getDistrict())
                .isDefault(address.isDefault())
                .build();
    }


    //add them dia chi
    @Override
    public UserAddressRes addAddress(Long userId, UserAddressReq req) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new NotFoundException(HttpStatus.NOT_FOUND, "User not found"));

        List<UserAddress> existingUserAddresses = userAddressRepo.findByUserId(user.getId());

        // logic dia chi mac dinh
        boolean isDefault = req.getIsDefault() != null ? req.getIsDefault() : false;

        if (existingUserAddresses.isEmpty()) {
            // Nếu là địa chỉ đầu tiên, ÉP BUỘC thành mặc định
            isDefault = true;
        } else if (isDefault) {
            // Nếu đánh dấu cái này là mặc định, phải đi tìm cái cũ và gỡ mặc định đi
            removeOldDefaultAddress(existingUserAddresses);
        }

        UserAddress address = UserAddress.builder()
                .user(user)
                .receiverName(req.getReceiverName())
                .receiverPhone(req.getReceiverPhone())
                .detailAddress(req.getDetailAddress())
                .addressType(normalizeAddressType(req.getAddressType()))
                .city(req.getCity())
                .district(req.getDistrict())
                .isDefault(isDefault)
                .build();

        return mapToRes(userAddressRepo.save(address));
    }

    //lay list dia chi cua user
    @Override
    public List<UserAddressRes> getUserAddresses(Long userId) {
        return userAddressRepo.findByUserId(userId)
                .stream().map(this::mapToRes).collect(Collectors.toList());
    }

    //cap nhat dia chi
    @Transactional
    @Override
    public UserAddressRes updateAddress(Long userId, Long addressId, UserAddressReq req) {
        UserAddress address = userAddressRepo.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy địa chỉ hoặc bạn không có quyền sửa!"));

        boolean isDefault = req.getIsDefault() != null ? req.getIsDefault() : false;

        // Nếu user tick chọn địa chỉ này làm mặc định mới
        if (isDefault && !address.isDefault()) {
            List<UserAddress> allAddresses = userAddressRepo.findByUserId(userId);
            removeOldDefaultAddress(allAddresses);
        }

        address.setReceiverName(req.getReceiverName());
        address.setReceiverPhone(req.getReceiverPhone());
        address.setDetailAddress(req.getDetailAddress());
        address.setAddressType(normalizeAddressType(req.getAddressType()));
        address.setCity(req.getCity());
        address.setDistrict(req.getDistrict());
        address.setDefault(isDefault || address.isDefault()); // Không cho phép tự tắt mặc định của chính nó nếu nó đang là mặc định

        return mapToRes(userAddressRepo.save(address));
    }

    @Override
    public void deleteAddress(Long userId, Long addressId) {
        UserAddress address = userAddressRepo.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new NotFoundException(HttpStatus.NOT_FOUND, "Không tìm thấy địa chỉ"));

        if (address.isDefault()) {
            throw new RuntimeException("Không thể xóa địa chỉ mặc định. Vui lòng chọn địa chỉ khác làm mặc định trước.");
        }

        userAddressRepo.delete(address);
    }

    @Override
    public void setDefaultAddress(Long userId, Long addressId) {
        UserAddress address = userAddressRepo.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new NotFoundException(HttpStatus.NOT_FOUND, "Không tìm thấy địa chỉ"));

        if (!address.isDefault()) {
            List<UserAddress> allAddresses = userAddressRepo.findByUserId(userId);
            removeOldDefaultAddress(allAddresses);

            address.setDefault(true);
            userAddressRepo.save(address);
        }
    }

    private String normalizeAddressType(String addressType) {
        return addressType == null || addressType.isBlank() ? "HOME" : addressType.trim();
    }
}
