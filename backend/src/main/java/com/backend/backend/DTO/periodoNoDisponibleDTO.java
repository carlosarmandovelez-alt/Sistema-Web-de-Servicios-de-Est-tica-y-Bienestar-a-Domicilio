package com.backend.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class periodoNoDisponibleDTO {

    private Integer id_periodo;
    private LocalDate fecha_inicio;
    private LocalDate fecha_fin;
}
