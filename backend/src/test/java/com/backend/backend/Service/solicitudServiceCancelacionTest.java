package com.backend.backend.Service;

import com.backend.backend.DTO.solicitudResponseDTO;
import com.backend.backend.Exception.disponibilidadException;
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
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pruebas unitarias de la lógica de cancelación de HU-017.
 *
 * Se cubren las reglas de estado por rol, la obligatoriedad y límite del
 * motivo, la propiedad de la solicitud y el uso del bloqueo pesimista que
 * serializa la cancelación con las demás transiciones.
 */
@ExtendWith(MockitoExtension.class)
class solicitudServiceCancelacionTest {

    private static final String EMAIL_CLIENTE = "cliente.hu017@example.com";
    private static final String EMAIL_PROVEEDOR = "proveedor.hu017@example.com";
    private static final Integer ID_SOLICITUD = 17;
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

    private usuarioModel usuarioCliente;
    private clienteModel cliente;
    private usuarioModel usuarioProveedor;
    private proveedorModel proveedor;
    private solicitud_reservaModel solicitud;

    @BeforeEach
    void setUp() {
        usuarioCliente = new usuarioModel();
        usuarioCliente.setId(6);
        usuarioCliente.setEmail(EMAIL_CLIENTE);

        cliente = new clienteModel();
        cliente.setId_cliente(6);
        cliente.setUsuario(usuarioCliente);

        usuarioProveedor = new usuarioModel();
        usuarioProveedor.setId(5);
        usuarioProveedor.setEmail(EMAIL_PROVEEDOR);

        proveedor = new proveedorModel();
        proveedor.setId_proveedor(5);
        proveedor.setUsuario(usuarioProveedor);

        solicitud = new solicitud_reservaModel();
        solicitud.setId_solicitud(ID_SOLICITUD);
        solicitud.setCliente(cliente);
        solicitud.setProveedor(proveedor);
        solicitud.setNombre_servicio_snapshot("Masaje relajante");
        solicitud.setPrecio_snapshot(new BigDecimal("80000.00"));
        solicitud.setDuracion_snapshot_minutos(60);
        solicitud.setFecha_hora_solicitada(LocalDateTime.of(2026, 12, 5, 10, 0));
        solicitud.setFecha_creacion(LocalDateTime.of(2026, 11, 20, 8, 0));
        solicitud.setFecha_actualizacion(FECHA_ANTERIOR);
        solicitud.setEstado(estadoSolicitudModel.pendiente);
    }

    private void prepararCliente() {
        when(usuarioRepository.findByEmail(EMAIL_CLIENTE)).thenReturn(Optional.of(usuarioCliente));
        when(clienteRepository.findByUsuario(usuarioCliente)).thenReturn(Optional.of(cliente));
        when(solicitudReservaRepository.buscarPorIdYClienteConBloqueo(ID_SOLICITUD, cliente))
            .thenReturn(Optional.of(solicitud));
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
    @DisplayName("Cliente cancela una solicitud Pendiente propia")
    void clienteCancelaSolicitudPendiente() {
        prepararCliente();
        prepararGuardado();

        solicitudResponseDTO respuesta = solicitudService.cancelarSolicitud(
            EMAIL_CLIENTE, "cliente", ID_SOLICITUD, "  Ya no puedo recibir el servicio  ");

        assertEquals("cancelada", respuesta.getEstado());
        assertEquals("Ya no puedo recibir el servicio", respuesta.getMotivo_rechazo_cancelacion());
        assertNotEquals(FECHA_ANTERIOR, respuesta.getFecha_actualizacion());
        verify(solicitudReservaRepository).buscarPorIdYClienteConBloqueo(ID_SOLICITUD, cliente);
        verify(solicitudReservaRepository).save(solicitud);
    }

    @Test
    @DisplayName("Cliente cancela una solicitud Sugerida propia")
    void clienteCancelaSolicitudSugerida() {
        solicitud.setEstado(estadoSolicitudModel.sugerida);
        prepararCliente();
        prepararGuardado();

        solicitudResponseDTO respuesta = solicitudService.cancelarSolicitud(
            EMAIL_CLIENTE, "cliente", ID_SOLICITUD, "Cambié de planes");

        assertEquals("cancelada", respuesta.getEstado());
        assertEquals("Cambié de planes", respuesta.getMotivo_rechazo_cancelacion());
        verify(solicitudReservaRepository).save(solicitud);
    }

    @Test
    @DisplayName("Cliente cancela una reserva Aceptada propia")
    void clienteCancelaReservaAceptada() {
        solicitud.setEstado(estadoSolicitudModel.aceptada);
        prepararCliente();
        prepararGuardado();

        solicitudResponseDTO respuesta = solicitudService.cancelarSolicitud(
            EMAIL_CLIENTE, "cliente", ID_SOLICITUD, "Emergencia familiar");

        assertEquals("cancelada", respuesta.getEstado());
        assertEquals("Emergencia familiar", respuesta.getMotivo_rechazo_cancelacion());
        verify(solicitudReservaRepository).save(solicitud);
    }

    @Test
    @DisplayName("Proveedor cancela una reserva Aceptada asociada a su cuenta")
    void proveedorCancelaReservaAceptada() {
        solicitud.setEstado(estadoSolicitudModel.aceptada);
        prepararProveedor();
        prepararGuardado();

        solicitudResponseDTO respuesta = solicitudService.cancelarSolicitud(
            EMAIL_PROVEEDOR, "proveedor", ID_SOLICITUD, "No podré asistir por enfermedad");

        assertEquals("cancelada", respuesta.getEstado());
        assertEquals("No podré asistir por enfermedad", respuesta.getMotivo_rechazo_cancelacion());
        verify(solicitudReservaRepository).buscarPorIdYProveedorConBloqueo(ID_SOLICITUD, proveedor);
        verify(solicitudReservaRepository).save(solicitud);
    }

    @Test
    @DisplayName("Rechaza la cancelación con motivo nulo sin modificar la solicitud")
    void rechazaMotivoNulo() {
        prepararCliente();

        assertThrows(disponibilidadException.class, () ->
            solicitudService.cancelarSolicitud(EMAIL_CLIENTE, "cliente", ID_SOLICITUD, null));

        assertEquals(estadoSolicitudModel.pendiente, solicitud.getEstado());
        assertEquals(FECHA_ANTERIOR, solicitud.getFecha_actualizacion());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rechaza la cancelación con motivo compuesto solo por espacios")
    void rechazaMotivoConEspacios() {
        prepararCliente();

        assertThrows(disponibilidadException.class, () ->
            solicitudService.cancelarSolicitud(EMAIL_CLIENTE, "cliente", ID_SOLICITUD, "   \t  "));

        assertEquals(estadoSolicitudModel.pendiente, solicitud.getEstado());
        assertEquals(FECHA_ANTERIOR, solicitud.getFecha_actualizacion());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rechaza un motivo mayor a 255 caracteres, límite real de la columna")
    void rechazaMotivoDemasiadoLargo() {
        prepararCliente();
        String motivo = "a".repeat(256);

        assertThrows(disponibilidadException.class, () ->
            solicitudService.cancelarSolicitud(EMAIL_CLIENTE, "cliente", ID_SOLICITUD, motivo));

        assertEquals(estadoSolicitudModel.pendiente, solicitud.getEstado());
        assertEquals(FECHA_ANTERIOR, solicitud.getFecha_actualizacion());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Un Cliente no puede cancelar una solicitud ajena")
    void clienteNoPuedeCancelarSolicitudAjena() {
        when(usuarioRepository.findByEmail(EMAIL_CLIENTE)).thenReturn(Optional.of(usuarioCliente));
        when(clienteRepository.findByUsuario(usuarioCliente)).thenReturn(Optional.of(cliente));
        when(solicitudReservaRepository.buscarPorIdYClienteConBloqueo(ID_SOLICITUD, cliente))
            .thenReturn(Optional.empty());

        assertThrows(solicitudNoEncontradaException.class, () ->
            solicitudService.cancelarSolicitud(EMAIL_CLIENTE, "cliente", ID_SOLICITUD, "Motivo"));

        assertEquals(estadoSolicitudModel.pendiente, solicitud.getEstado());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("Un Proveedor no puede cancelar una reserva de otro Proveedor")
    void proveedorNoPuedeCancelarReservaAjena() {
        when(usuarioRepository.findByEmail(EMAIL_PROVEEDOR)).thenReturn(Optional.of(usuarioProveedor));
        when(proveedorRepository.findByUsuario(usuarioProveedor)).thenReturn(Optional.of(proveedor));
        when(solicitudReservaRepository.buscarPorIdYProveedorConBloqueo(ID_SOLICITUD, proveedor))
            .thenReturn(Optional.empty());

        assertThrows(solicitudNoEncontradaException.class, () ->
            solicitudService.cancelarSolicitud(EMAIL_PROVEEDOR, "proveedor", ID_SOLICITUD, "Motivo"));

        assertEquals(estadoSolicitudModel.pendiente, solicitud.getEstado());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("No se puede cancelar una reserva Completada")
    void noSePuedeCancelarReservaCompletada() {
        solicitud.setEstado(estadoSolicitudModel.completada);
        prepararCliente();

        estadoInvalidoException error = assertThrows(estadoInvalidoException.class, () ->
            solicitudService.cancelarSolicitud(EMAIL_CLIENTE, "cliente", ID_SOLICITUD, "Motivo"));

        assertEquals("No se puede cancelar una reserva que ya fue completada", error.getMessage());
        assertEquals(estadoSolicitudModel.completada, solicitud.getEstado());
        assertEquals(FECHA_ANTERIOR, solicitud.getFecha_actualizacion());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("No se puede cancelar dos veces una solicitud Cancelada")
    void noSePuedeCancelarSolicitudYaCancelada() {
        solicitud.setEstado(estadoSolicitudModel.cancelada);
        solicitud.setMotivo_rechazo_cancelacion("Motivo original");
        prepararCliente();

        estadoInvalidoException error = assertThrows(estadoInvalidoException.class, () ->
            solicitudService.cancelarSolicitud(EMAIL_CLIENTE, "cliente", ID_SOLICITUD, "Motivo nuevo"));

        assertEquals("La solicitud ya se encuentra cancelada", error.getMessage());
        assertEquals("Motivo original", solicitud.getMotivo_rechazo_cancelacion());
        assertEquals(FECHA_ANTERIOR, solicitud.getFecha_actualizacion());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("No se puede cancelar una solicitud Rechazada")
    void noSePuedeCancelarSolicitudRechazada() {
        solicitud.setEstado(estadoSolicitudModel.rechazada);
        prepararCliente();

        assertThrows(estadoInvalidoException.class, () ->
            solicitudService.cancelarSolicitud(EMAIL_CLIENTE, "cliente", ID_SOLICITUD, "Motivo"));

        assertEquals(estadoSolicitudModel.rechazada, solicitud.getEstado());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("El Proveedor no puede cancelar una solicitud Pendiente")
    void proveedorNoPuedeCancelarSolicitudPendiente() {
        prepararProveedor();

        estadoInvalidoException error = assertThrows(estadoInvalidoException.class, () ->
            solicitudService.cancelarSolicitud(EMAIL_PROVEEDOR, "proveedor", ID_SOLICITUD, "Motivo"));

        assertEquals("El Proveedor solo puede cancelar reservas en estado Aceptada", error.getMessage());
        assertEquals(estadoSolicitudModel.pendiente, solicitud.getEstado());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("El Proveedor no puede cancelar una solicitud Sugerida")
    void proveedorNoPuedeCancelarSolicitudSugerida() {
        solicitud.setEstado(estadoSolicitudModel.sugerida);
        prepararProveedor();

        assertThrows(estadoInvalidoException.class, () ->
            solicitudService.cancelarSolicitud(EMAIL_PROVEEDOR, "proveedor", ID_SOLICITUD, "Motivo"));

        assertEquals(estadoSolicitudModel.sugerida, solicitud.getEstado());
        verify(solicitudReservaRepository, never()).save(any());
    }

    @Test
    @DisplayName("El rol recibido debe ser cliente o proveedor")
    void rechazaRolNoAutorizado() {
        assertThrows(estadoInvalidoException.class, () ->
            solicitudService.cancelarSolicitud(EMAIL_CLIENTE, "administrador", ID_SOLICITUD, "Motivo"));

        verify(solicitudReservaRepository, never()).save(any());
        verify(solicitudReservaRepository, never()).buscarPorIdYClienteConBloqueo(anyInt(), any());
    }

    @Test
    @DisplayName("La cancelación conserva el resto de los datos históricos")
    void conservaDatosHistoricos() {
        solicitud.setEstado(estadoSolicitudModel.aceptada);
        prepararCliente();
        prepararGuardado();

        solicitudResponseDTO respuesta = solicitudService.cancelarSolicitud(
            EMAIL_CLIENTE, "cliente", ID_SOLICITUD, "Cancelación de prueba");

        assertEquals("Masaje relajante", respuesta.getNombre_servicio_snapshot());
        assertEquals(new BigDecimal("80000.00"), respuesta.getPrecio_snapshot());
        assertEquals(60, respuesta.getDuracion_snapshot_minutos());
        assertEquals(LocalDateTime.of(2026, 12, 5, 10, 0), respuesta.getFecha_hora_solicitada());
        assertEquals(ID_SOLICITUD, respuesta.getId_solicitud());
        assertEquals(6, respuesta.getId_cliente());
        assertEquals(5, respuesta.getId_proveedor());
    }
}
