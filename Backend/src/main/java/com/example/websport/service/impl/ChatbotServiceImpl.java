package com.example.websport.service.impl;

import com.example.websport.service.ChatbotService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotServiceImpl implements ChatbotService {

    @Value("${gemini.api.key}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String chat(String message) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Construct payload
            Map<String, Object> systemInstruction = new HashMap<>();
            Map<String, Object> partsSys = new HashMap<>();
            partsSys.put("text", "You are a helpful, enthusiastic, and knowledgeable sports shopping assistant for Velocity Prime, an e-commerce store specializing in sports equipment like badminton rackets, shoes, and sportswear. Only answer questions related to sports, shopping at Velocity Prime, store policies, or product advice. Refuse to answer completely unrelated questions politely.");
            systemInstruction.put("parts", Collections.singletonList(partsSys));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("system_instruction", systemInstruction);

            Map<String, Object> content = new HashMap<>();
            Map<String, Object> parts = new HashMap<>();
            parts.put("text", message);
            content.put("parts", Collections.singletonList(parts));

            requestBody.put("contents", Collections.singletonList(content));

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            String responseStr = restTemplate.postForObject(url, request, String.class);

            // Parse response
            JsonNode root = objectMapper.readTree(responseStr);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode contentNode = firstCandidate.path("content");
                JsonNode partsNode = contentNode.path("parts");
                if (partsNode.isArray() && partsNode.size() > 0) {
                    return partsNode.get(0).path("text").asText();
                }
            }
            return "Xin lỗi, tôi không thể trả lời lúc này.";

        } catch (Exception e) {
            log.error("Error communicating with Gemini API", e);
            return "Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại sau.";
        }
    }
}
