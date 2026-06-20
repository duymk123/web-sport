package com.example.websport.service;

import com.example.websport.dto.request.ReturnRequestCreateReq;
import com.example.websport.dto.request.ReturnRequestStatusReq;
import com.example.websport.dto.response.ReturnRequestRes;

import java.util.List;

public interface ReturnRequestService {
    ReturnRequestRes createReturnRequest(Long userId, ReturnRequestCreateReq req);

    List<ReturnRequestRes> getMyReturnRequests(Long userId);

    List<ReturnRequestRes> getAllReturnRequests();

    ReturnRequestRes adminUpdateStatus(Long id, ReturnRequestStatusReq req);
}
