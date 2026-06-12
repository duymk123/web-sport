package com.example.websport.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class NotFoundException extends RuntimeException {
    private final HttpStatus status ;
    public NotFoundException(HttpStatus status , String message) {
        super(message);
        this.status = status ;
    }
}
