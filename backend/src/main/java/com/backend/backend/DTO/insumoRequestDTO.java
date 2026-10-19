package com.backend.backend.DTO;

import com.backend.backend.Model.enums.tipoInsumoModel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class insumoRequestDTO {
    
    @NotBlank(message = "El nombre del insumo o equipo es obligatorio")
    private String nombre;
    
    @NotNull(message = "El tipo es obligatorio")
    private tipoInsumoModel tipo;
}