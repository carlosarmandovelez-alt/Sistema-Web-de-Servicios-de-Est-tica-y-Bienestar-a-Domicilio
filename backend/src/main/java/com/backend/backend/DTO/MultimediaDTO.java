package com.backend.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MultimediaDTO {
    
    private Integer id;
    private String tipo_archivo;
    private String url_archivo;
    private Integer orden;
}