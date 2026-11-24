package com.backend.backend.Service;

import com.backend.backend.DTO.solicitudResponseDTO;
import com.backend.backend.Exception.estadoInvalidoException;
import com.backend.backend.Exception.solicitudNoEncontradaException;
import com.backend.backend.Model.clienteModel;
import com.backend.backend.Model.proveedorModel;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas unitarias de HU-018: finalización de una reserva Aceptada.
 *
 * Cubren la transición Aceptada -> Completada, la conservación de datos
 * históricos, la fecha de creación, los estados no permitidos y la
 * verificación de propiedad mediante la consulta con bloqueo.
 */
@ExtendWith(MockitoExtension.class)
class solicitudServiceFinalizacionTest {

    private static final String EMAIL_PROVEEDOR = "proveedor.hu018@example.com";
    private static final Integer ID_SOLICITUD = 18;
    private static final LocalDateTime FECHA_CREACION = LocalDateTime.of(2026, 11, 10, 8, 0);
    private static final LocalDateTime FECHA_ANTERIOR = LocalDateTime.of(2026, 11, 20, 9, 0);

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

        cliente = new clienteModel();
        cliente.setId_cliente(6);

        solicitud = new solicitud_reservaModel();
        solicitud.setId_solicitud(ID_SOLICITUD);
        solicitud.setCliente(cliente);
        solicitud.setProveedor(proveedor);
        solicitud.setNombre_servicio_snapshot("Masaje relajante");
        solicitud.setPrecio_snapshot(new BigDecimal("80000.00"));
        solicitud.setDuracion_snapshot_minutos(60);
        solicitud.setFecha_hora_solicitada(LocalDateTime.of(2026, 12, 7, 10, 0));
        solicitud.setFecha_hora_propuesta(LocalDateTime.of(2026, 12, 7, 10, 0));
        solicitud.setDireccion_texto("Calle 18 # 18-18");
        solicitud.setBarrio_sector("Barrio Hu018");
        solicitud.setInformacion_complementaria("Casa 4, timbre azul");
        solicitud.setObservaciones("Observaciones históricas");
        solicitud.setEstado(estadoSolicitudModel.aceptada);
        solicitud.setMotivo_rechazo_cancelacion(null);
        solicitud.setFecha_creacion(FECHA_CREACION);
        solicitud.setFecha_actualizacion(FECHA_ANTERIOR);
    }

    private void prepararProveedor() {
        when(usuarioRepository.findByEmail(EMAIL_PROVEEDOR)).thenReturn(Optional.of(usuarioProveedor));
        when(proveedorRepository.findByUsuario(usuarioProveedor)).thenReturn(Optional.of(proveedor));
        when(solicitudReservaRepository.buscarPorIdYProveedorConBloqueo(ID_SOLICITUD, proveedor))
            .thenReturn(Optional.of(solicitud));
    }

    private void prepararGuardado() {
        when(solicitudReservaRepository.save(any(solicitud_reservaModel.class)))
            .thenAnswer(invocacion -> invocacion.getArgument(0));
    }

    @Test
    @DisplayName("El Proveedor completa una reserva Aceptada y actualiza la fecha")
    void proveedorCompletaReservaAceptada() {
        prepararProveedor();
        prepararGuardado();

        solicitudResponseDTO respuesta = solicitudService.completarServicio(EMAIL_PROVEEDOR, ID_SOLICITUD);

        assertEquals("completada", respuesta.getEstado());
        assertEquals(estadoSolicitudModel.completada, solicitud.getEstado());
        assertNotEquals(FECHA_ANTERIOR, respuesta.getFecha_actualizacion());
        assertEquals(FECHA_CREACION, respuesta.getFecha_creacion());
        verify(solicitudReservaRepository).buscarPorIdYProveedorConBloqueo(ID_SOLICITUD, proveedor);
        verify(solicitudReservaRepository).save(solicitud);
    }

    @Test
    @DisplayName("La finalización conserva nombre, precio, duración, fechas y datos de atención")
    void conservaDatosHistoricos() {
        prepararProveedor();
        prepararGuardado();

        solicitudResponseDTO respuesta = solicitudService.completarServicio(EMAIL_PROVEEDOR, ID_SOLICITUD);

        assertEquals("Masaje relajante", respuesta.getNombre_servicio_snapshot());
        assertEquals(new BigDecimal("80000.00"), respuesta.getPrecio_snapshot());
        assertEquals(60, respuesta.getDuracion_snapshot_minutos());
        assertEquals(LocalDateTime.of(2026, 12, 7, 10, 0), respuesta.getFecha_hora_solicitada());
        assertEquals(LocalDateTime.of(2026, 12, 7, 10, 0), respuesta.getFecha_hora_propuesta());
        assertEquals("Calle 18 # 18-18", respuesta.getDireccion_texto());
        assertEquals("Barrio Hu018", respuesta.getBarrio_sector());
        assertEquals("Casa 4, timbre azul", respuesta.getInformacion_complementaria());
        assertEquals("Observaciones históricas", respuesta.getObservaciones());
        assertEquals(ID_SOLICITUD, respuesta.getId_solicitud());
        assertEquals(6, respuesta.getId_cliente());
        assertEquals(5, respuesta.getId_proveedor());
    }

    @Test
    @DisplayName("No se puede completar una reserva Pendiente")
    void noCompletaPendiente() {
        solicitud.setEstado(estadoSolicitudModel.pendiente);
        prepararProveedor();

        assertThrows(estadoInvalidoException.class, () ->
            solicitudService.completarServicio(EMAIL_PROVEEDOR, ID_SOLICITUD));

        assertEquals(estadoSolicitudModel.pendiente, solicitud.getEstado());
        assertEquals(FECHA_ANTERIOR, solicitud.getFecha_actualizacion());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("No se puede completar una solicitud Sugerida")
    void noCompletaSugerida() {
        solicitud.setEstado(estadoSolicitudModel.sugerida);
        prepararProveedor();

        assertThrows(estadoInvalidoException.class, () ->
            solicitudService.completarServicio(EMAIL_PROVEEDOR, ID_SOLICITUD));

        assertEquals(estadoSolicitudModel.sugerida, solicitud.getEstado());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("No se puede completar una solicitud Rechazada")
    void noCompletaRechazada() {
        solicitud.setEstado(estadoSolicitudModel.rechazada);
        solicitud.setMotivo_rechazo_cancelacion("No hay cobertura");
        prepararProveedor();

        assertThrows(estadoInvalidoException.class, () ->
            solicitudService.completarServicio(EMAIL_PROVEEDOR, ID_SOLICITUD));

        assertEquals(estadoSolicitudModel.rechazada, solicitud.getEstado());
        assertEquals("No hay cobertura", solicitud.getMotivo_rechazo_cancelacion());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("No se puede completar una reserva Cancelada ni se sobrescribe su motivo")
    void noCompletaCancelada() {
        solicitud.setEstado(estadoSolicitudModel.cancelada);
        solicitud.setMotivo_rechazo_cancelacion("Cancelación previa");
        prepararProveedor();

        assertThrows(estadoInvalidoException.class, () ->
            solicitudService.completarServicio(EMAIL_PROVEEDOR, ID_SOLICITUD));

        assertEquals(estadoSolicitudModel.cancelada, solicitud.getEstado());
        assertEquals("Cancelación previa", solicitud.getMotivo_rechazo_cancelacion());
        assertEquals(FECHA_ANTERIOR, solicitud.getFecha_actualizacion());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("No se puede completar dos veces una reserva ya Completada")
    void noCompletaReservaYaCompletada() {
        solicitud.setEstado(estadoSolicitudModel.completada);
        prepararProveedor();

        assertThrows(estadoInvalidoException.class, () ->
            solicitudService.completarServicio(EMAIL_PROVEEDOR, ID_SOLICITUD));

        assertEquals(estadoSolicitudModel.completada, solicitud.getEstado());
        assertEquals(FECHA_ANTERIOR, solicitud.getFecha_actualizacion());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Un Proveedor no puede completar una reserva de otro Proveedor")
    void proveedorAjenoNoPuedeCompletar() {
        when(usuarioRepository.findByEmail(EMAIL_PROVEEDOR)).thenReturn(Optional.of(usuarioProveedor));
        when(proveedorRepository.findByUsuario(usuarioProveedor)).thenReturn(Optional.of(proveedor));
        when(solicitudReservaRepository.buscarPorIdYProveedorConBloqueo(ID_SOLICITUD, proveedor))
            .thenReturn(Optional.empty());

        assertThrows(solicitudNoEncontradaException.class, () ->
            solicitudService.completarServicio(EMAIL_PROVEEDOR, ID_SOLICITUD));

        assertEquals(estadoSolicitudModel.aceptada, solicitud.getEstado());
        assertEquals(FECHA_ANTERIOR, solicitud.getFecha_actualizacion());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Un usuario inexistente no puede completar una reserva")
    void usuarioInexistenteNoPuedeCompletar() {
        when(usuarioRepository.findByEmail(EMAIL_PROVEEDOR)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
            solicitudService.completarServicio(EMAIL_PROVEEDOR, ID_SOLICITUD));

        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("La finalización fallida conserva la fecha de creación y la fecha de actualización")
    void intentoFallidoConservaFechas() {
        solicitud.setEstado(estadoSolicitudModel.pendiente);
        prepararProveedor();

        assertThrows(estadoInvalidoException.class, () ->
            solicitudService.completarServicio(EMAIL_PROVEEDOR, ID_SOLICITUD));

        assertEquals(FECHA_CREACION, solicitud.getFecha_creacion());
        assertEquals(FECHA_ANTERIOR, solicitud.getFecha_actualizacion());
    }
}
