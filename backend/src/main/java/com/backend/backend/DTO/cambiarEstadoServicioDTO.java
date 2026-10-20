package com.backend.backend.DTO;

import com.backend.backend.Model.enums.estadoServicioModel;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class cambiarEstadoServicioDTO {
    
    @NotNull(message = "El estado es obligatorio")
    private estadoServicioModel estado;
}

