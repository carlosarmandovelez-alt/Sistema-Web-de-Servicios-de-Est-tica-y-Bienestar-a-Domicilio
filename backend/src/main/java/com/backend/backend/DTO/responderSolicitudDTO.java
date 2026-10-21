package com.backend.backend.DTO;

import com.backend.backend.Model.enums.accionRespuestaModel;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class responderSolicitudDTO {

    @NotNull(message = "La acción es obligatoria (aceptar, rechazar o proponer)")
    private accionRespuestaModel accion;

    private LocalDateTime fecha_hora_propuesta;

    @Size(max = 255, message = "El motivo no puede superar los 255 caracteres")
    private String motivo;
}
