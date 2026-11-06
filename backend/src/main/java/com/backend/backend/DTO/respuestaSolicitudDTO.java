package com.backend.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class respuestaSolicitudDTO {
    // Para el rechazo
    private String motivo_rechazo;
}