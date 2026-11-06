package com.backend.backend.DTO;

import com.backend.backend.Model.enums.tipoArchivoModel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class multimediaRequestDTO {
    
    @NotNull(message = "El tipo de archivo es obligatorio")
    private tipoArchivoModel tipo_archivo;
    
    @NotBlank(message = "La URL del archivo es obligatoria")
    private String url_archivo;
    
    private Integer orden;
}