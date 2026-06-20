package com.example.websport.controller;

import com.example.websport.dto.request.ChatReq;
import com.example.websport.dto.response.ChatRes;
import com.example.websport.service.ChatbotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/")
public class ChatController {

    private final ChatbotService chatbotService;

    @PostMapping("/chat")
    public ResponseEntity<ChatRes> chat(@RequestBody ChatReq req) {
        String reply = chatbotService.chat(req.getMessage());
        return ResponseEntity.ok(ChatRes.builder().reply(reply).build());
    }
}
