package com.backend.backend.DTO;

import com.backend.backend.Model.enums.tipoArchivoModel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * HU-008: Datos para asociar una fotografía o un video de referencia a un servicio.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class multimediaRequestDTO {
    
    @NotNull(message = "El tipo de archivo es obligatorio (foto o video)")
    private tipoArchivoModel tipo_archivo;
    
    @NotBlank(message = "La URL del archivo es obligatoria")
    @Size(max = 500, message = "La URL no puede superar los 500 caracteres")
    @Pattern(regexp = "^(https?://)\\S+$", message = "La URL debe iniciar con http:// o https:// y no contener espacios")
    private String url_archivo;
    
    @Min(value = 0, message = "El orden no puede ser negativo")
    @Max(value = 65535, message = "El orden no puede superar 65535")
    private Integer orden;
}
