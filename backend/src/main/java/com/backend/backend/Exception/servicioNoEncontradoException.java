package com.backend.backend.Exception;

public class servicioNoEncontradoException extends RuntimeException {
    
    public servicioNoEncontradoException(String message) {
        super(message);
    }
}