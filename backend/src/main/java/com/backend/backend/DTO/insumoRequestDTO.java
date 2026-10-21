package com.backend.backend.DTO;

import com.backend.backend.Model.enums.tipoInsumoModel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * HU-008: Datos para registrar un producto, insumo o equipo utilizado en un servicio.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class insumoRequestDTO {
    
    @NotBlank(message = "El nombre del producto, insumo o equipo es obligatorio")
    @Size(max = 150, message = "El nombre no puede superar los 150 caracteres")
    private String nombre;
    
    @NotNull(message = "El tipo es obligatorio (producto, insumo o equipo)")
    private tipoInsumoModel tipo;
}
