package com.backend.backend.Service;

import com.backend.backend.DTO.agendaResponseDTO;
import com.backend.backend.Model.clienteModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.servicioModel;
import com.backend.backend.Model.solicitud_reservaModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Model.enums.estadoSolicitudModel;
import com.backend.backend.Repository.clienteRepository;
import com.backend.backend.Repository.disponibilidadRepository;
import com.backend.backend.Repository.periodoNoDisponibleRepository;
import com.backend.backend.Repository.proveedorRepository;
import com.backend.backend.Repository.servicioRepository;
import com.backend.backend.Repository.solicitudReservaRepository;
import com.backend.backend.Repository.usuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas unitarias de HU-019: consulta de la agenda del Proveedor.
 *
 * Verifican el mapeo de la reserva aceptada, el uso de la duración histórica,
 * el cálculo de la hora de finalización (incluido el cambio de día), la
 * identidad del Proveedor autenticado y la agenda vacía.
 */
@ExtendWith(MockitoExtension.class)
class solicitudServiceAgendaTest {

    private static final String EMAIL_PROVEEDOR = "proveedor.hu019@example.com";

    @Mock
    private solicitudReservaRepository solicitudReservaRepository;

    @Mock
    private servicioRepository servicioRepository;

    @Mock
    private usuarioRepository usuarioRepository;

    @Mock
    private clienteRepository clienteRepository;

    @Mock
    private disponibilidadRepository disponibilidadRepository;

    @Mock
    private periodoNoDisponibleRepository periodoNoDisponibleRepository;

    @Mock
    private proveedorRepository proveedorRepository;

    @InjectMocks
    private solicitudService solicitudService;

    private usuarioModel usuarioProveedor;
    private proveedorModel proveedor;
    private usuarioModel usuarioCliente;
    private clienteModel cliente;
    private solicitud_reservaModel solicitud;

    @BeforeEach
    void setUp() {
        usuarioProveedor = new usuarioModel();
        usuarioProveedor.setId(5);
        usuarioProveedor.setEmail(EMAIL_PROVEEDOR);

        proveedor = new proveedorModel();
        proveedor.setId_proveedor(5);
        proveedor.setUsuario(usuarioProveedor);

        usuarioCliente = new usuarioModel();
        usuarioCliente.setId(6);
        usuarioCliente.setNombre("Ana");
        usuarioCliente.setApellido("Pérez");

        cliente = new clienteModel();
        cliente.setId_cliente(6);
        cliente.setUsuario(usuarioCliente);

        solicitud = new solicitud_reservaModel();
        solicitud.setId_solicitud(19);
        solicitud.setCliente(cliente);
        solicitud.setProveedor(proveedor);
        solicitud.setNombre_servicio_snapshot("Masaje relajante histórico");
        solicitud.setPrecio_snapshot(new java.math.BigDecimal("90000.00"));
        solicitud.setDuracion_snapshot_minutos(90);
        solicitud.setFecha_hora_solicitada(LocalDateTime.of(2026, 12, 7, 10, 30));
        solicitud.setDireccion_texto("Calle 19 # 19-19");
        solicitud.setBarrio_sector("Barrio Hu019");
        solicitud.setEstado(estadoSolicitudModel.aceptada);
        solicitud.setFecha_creacion(LocalDateTime.of(2026, 11, 20, 8, 0));
        solicitud.setFecha_actualizacion(LocalDateTime.of(2026, 11, 20, 9, 0));
    }

    private void prepararProveedor(List<solicitud_reservaModel> reservas) {
        when(usuarioRepository.findByEmail(EMAIL_PROVEEDOR)).thenReturn(Optional.of(usuarioProveedor));
        when(proveedorRepository.findByUsuario(usuarioProveedor)).thenReturn(Optional.of(proveedor));
        when(solicitudReservaRepository.findAgendaAceptadaByProveedor(proveedor)).thenReturn(reservas);
    }

    @Test
    @DisplayName("Devuelve la reserva con su duración histórica y calcula la hora de fin")
    void devuelveReservaConDuracionHistorica() {
        // El catálogo actual tiene 30 minutos; la reserva conserva 90.
        servicioModel servicioActual = new servicioModel();
        servicioActual.setDuracion_minutos(30);
        solicitud.setServicio(servicioActual);

        prepararProveedor(List.of(solicitud));

        List<agendaResponseDTO> agenda = solicitudService.consultarAgenda(EMAIL_PROVEEDOR);

        assertEquals(1, agenda.size());
        agendaResponseDTO item = agenda.get(0);
        assertEquals(19, item.getId_solicitud());
        assertEquals("Masaje relajante histórico", item.getNombre_servicio());
        assertEquals(LocalDateTime.of(2026, 12, 7, 10, 30), item.getFecha_hora_inicio());
        assertEquals(LocalDateTime.of(2026, 12, 7, 12, 0), item.getFecha_hora_fin());
        assertEquals(90, item.getDuracion_snapshot_minutos());
        assertEquals("Ana Pérez", item.getNombre_cliente());
        assertEquals("Calle 19 # 19-19", item.getDireccion_texto());
        assertEquals("Barrio Hu019", item.getBarrio_sector());
        verify(solicitudReservaRepository).findAgendaAceptadaByProveedor(proveedor);
    }

    @Test
    @DisplayName("Calcula correctamente una finalización que cruza la medianoche")
    void calculaFinCruzandoMedianoche() {
        solicitud.setFecha_hora_solicitada(LocalDateTime.of(2026, 12, 7, 23, 30));
        solicitud.setDuracion_snapshot_minutos(90);
        prepararProveedor(List.of(solicitud));

        agendaResponseDTO item = solicitudService.consultarAgenda(EMAIL_PROVEEDOR).get(0);

        assertEquals(LocalDateTime.of(2026, 12, 8, 1, 0), item.getFecha_hora_fin());
    }

    @Test
    @DisplayName("Devuelve una lista vacía cuando no hay reservas aceptadas")
    void agendaVacia() {
        prepararProveedor(List.of());

        List<agendaResponseDTO> agenda = solicitudService.consultarAgenda(EMAIL_PROVEEDOR);

        assertTrue(agenda.isEmpty());
        verify(solicitudReservaRepository).findAgendaAceptadaByProveedor(proveedor);
    }

    @Test
    @DisplayName("Conserva el orden cronológico entregado por el repositorio")
    void conservaOrdenCronologico() {
        solicitud_reservaModel segunda = new solicitud_reservaModel();
        segunda.setId_solicitud(20);
        segunda.setCliente(cliente);
        segunda.setProveedor(proveedor);
        segunda.setNombre_servicio_snapshot("Servicio posterior");
        segunda.setDuracion_snapshot_minutos(60);
        segunda.setFecha_hora_solicitada(LocalDateTime.of(2026, 12, 8, 9, 0));

        prepararProveedor(List.of(solicitud, segunda));

        List<agendaResponseDTO> agenda = solicitudService.consultarAgenda(EMAIL_PROVEEDOR);

        assertEquals(19, agenda.get(0).getId_solicitud());
        assertEquals(20, agenda.get(1).getId_solicitud());
    }

    @Test
    @DisplayName("Un Proveedor inexistente no puede consultar una agenda")
    void proveedorInexistente() {
        when(usuarioRepository.findByEmail(EMAIL_PROVEEDOR)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
            solicitudService.consultarAgenda(EMAIL_PROVEEDOR));
    }
}
