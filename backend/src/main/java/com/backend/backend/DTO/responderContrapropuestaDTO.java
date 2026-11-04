package com.backend.backend.DTO;

import com.backend.backend.Model.enums.accionContrapropuestaModel;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class responderContrapropuestaDTO {

    @NotNull(message = "La acción es obligatoria (aceptar o rechazar)")
    private accionContrapropuestaModel accion;

    @Size(max = 255, message = "El motivo no puede superar los 255 caracteres")
    private String motivo;
}
