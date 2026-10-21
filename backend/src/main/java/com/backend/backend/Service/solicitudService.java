package com.backend.backend.Service;

import com.backend.backend.DTO.*;
import com.backend.backend.Exception.accesoDenegadoException;
import com.backend.backend.Exception.datosInvalidosException;
import com.backend.backend.Exception.estadoSolicitudInvalidoException;
import com.backend.backend.Exception.servicioNoEncontradoException;
import com.backend.backend.Exception.solicitudNoEncontradaException;
import com.backend.backend.Model.clienteModel;
import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.enums.estadoSolicitudModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.servicioModel;
import com.backend.backend.Model.solicitud_reservaModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Repository.clienteRepository;
import com.backend.backend.Repository.proveedorRepository;
import com.backend.backend.Repository.servicioRepository;
import com.backend.backend.Repository.solicitudReservaRepository;
import com.backend.backend.Repository.usuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class solicitudService {

    @Autowired
    private solicitudReservaRepository solicitudReservaRepository;

    @Autowired
    private servicioRepository servicioRepository;

    @Autowired
    private usuarioRepository usuarioRepository;

    @Autowired
    private clienteRepository clienteRepository;

    @Autowired
    private proveedorRepository proveedorRepository;

    // ============================================
    // HU-012: Crear solicitud (soporte para HU-015 a HU-019)
    // ============================================
    @Transactional
    public solicitudResponseDTO crearSolicitud(String email, crearSolicitudDTO dto) {
        clienteModel cliente = obtenerCliente(email);

        servicioModel servicio = servicioRepository.findById(dto.getId_servicio())
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe"));

        if (servicio.getEstado() != estadoServicioModel.activo) {
            throw new datosInvalidosException("El servicio no se encuentra disponible");
        }

        solicitud_reservaModel solicitud = new solicitud_reservaModel();
        solicitud.setServicio(servicio);
        solicitud.setCliente(cliente);
        solicitud.setProveedor(servicio.getProveedor());
        solicitud.setNombre_servicio_snapshot(servicio.getNombre());
        solicitud.setPrecio_snapshot(servicio.getPrecio());
        solicitud.setDuracion_snapshot_minutos(servicio.getDuracion_minutos());
        solicitud.setFecha_hora_solicitada(dto.getFecha_hora_solicitada());
        solicitud.setDireccion_texto(dto.getDireccion_texto().trim());
        solicitud.setBarrio_sector(dto.getBarrio_sector());
        solicitud.setInformacion_complementaria(dto.getInformacion_complementaria());
        solicitud.setObservaciones(dto.getObservaciones());
        solicitud.setEstado(estadoSolicitudModel.pendiente);
        solicitud.setFecha_creacion(LocalDateTime.now());
        solicitud.setFecha_actualizacion(LocalDateTime.now());

        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }

    // ============================================
    // HU-013 / HU-014: Consultas
    // ============================================
    public List<solicitudResponseDTO> listarSolicitudesCliente(String email) {
        clienteModel cliente = obtenerCliente(email);
        return solicitudReservaRepository.listarPorCliente(cliente).stream()
            .map(this::convertirADTO)
            .collect(Collectors.toList());
    }

    public List<solicitudResponseDTO> listarSolicitudesProveedor(String email) {
        proveedorModel proveedor = obtenerProveedor(email);
        return solicitudReservaRepository.listarPorProveedor(proveedor).stream()
            .map(this::convertirADTO)
            .collect(Collectors.toList());
    }

    public solicitudResponseDTO consultarDetalle(String email, Integer idSolicitud) {
        usuarioModel usuario = obtenerUsuario(email);
        solicitud_reservaModel solicitud;

        if (usuario.getRol().name().equals("cliente")) {
            clienteModel cliente = obtenerCliente(email);
            solicitud = solicitudReservaRepository.buscarPorIdYCliente(idSolicitud, cliente)
                .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no tiene permiso para verla"));
        } else {
            proveedorModel proveedor = obtenerProveedor(email);
            solicitud = solicitudReservaRepository.buscarPorIdYProveedor(idSolicitud, proveedor)
                .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no está dirigida a usted"));
        }

        return convertirADTO(solicitud);
    }

    // ============================================
    // HU-015: Respuesta del Proveedor
    // ============================================
    @Transactional
    public solicitudResponseDTO responderSolicitud(String email, Integer idSolicitud, responderSolicitudDTO dto) {
        proveedorModel proveedor = obtenerProveedor(email);
        solicitud_reservaModel solicitud = solicitudReservaRepository.buscarPorIdYProveedor(idSolicitud, proveedor)
            .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no está dirigida a usted"));

        if (solicitud.getEstado() != estadoSolicitudModel.pendiente) {
            throw new estadoSolicitudInvalidoException(
                "Solo se puede responder una solicitud en estado pendiente. Estado actual: " + solicitud.getEstado());
        }

        switch (dto.getAccion()) {
            case aceptar -> {
                solicitud.setEstado(estadoSolicitudModel.aceptada);
                solicitud.setFecha_hora_propuesta(null);
                solicitud.setMotivo_rechazo_cancelacion(null);
            }
            case rechazar -> {
                if (dto.getMotivo() == null || dto.getMotivo().isBlank()) {
                    throw new datosInvalidosException("Debe indicar el motivo del rechazo");
                }
                solicitud.setEstado(estadoSolicitudModel.rechazada);
                solicitud.setFecha_hora_propuesta(null);
                solicitud.setMotivo_rechazo_cancelacion(dto.getMotivo().trim());
            }
            case proponer -> {
                if (dto.getFecha_hora_propuesta() == null) {
                    throw new datosInvalidosException("Debe indicar la nueva fecha y hora propuesta");
                }
                if (!dto.getFecha_hora_propuesta().isAfter(LocalDateTime.now())) {
                    throw new datosInvalidosException("La fecha y hora propuesta debe ser en el futuro");
                }
                solicitud.setEstado(estadoSolicitudModel.sugerida);
                solicitud.setFecha_hora_propuesta(dto.getFecha_hora_propuesta());
                solicitud.setMotivo_rechazo_cancelacion(null);
            }
        }

        solicitud.setFecha_actualizacion(LocalDateTime.now());
        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }

    // ============================================
    // HU-016: Respuesta del Cliente a la contrapropuesta
    // ============================================
    @Transactional
    public solicitudResponseDTO responderContrapropuesta(String email, Integer idSolicitud, responderContrapropuestaDTO dto) {
        clienteModel cliente = obtenerCliente(email);
        solicitud_reservaModel solicitud = solicitudReservaRepository.buscarPorIdYCliente(idSolicitud, cliente)
            .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no le pertenece"));

        if (solicitud.getEstado() != estadoSolicitudModel.sugerida) {
            throw new estadoSolicitudInvalidoException(
                "La solicitud no tiene una contrapropuesta pendiente. Estado actual: " + solicitud.getEstado());
        }
        if (solicitud.getFecha_hora_propuesta() == null) {
            throw new estadoSolicitudInvalidoException("La solicitud no tiene una fecha y hora propuesta");
        }

        switch (dto.getAccion()) {
            case aceptar -> {
                solicitud.setFecha_hora_solicitada(solicitud.getFecha_hora_propuesta());
                solicitud.setFecha_hora_propuesta(null);
                solicitud.setEstado(estadoSolicitudModel.aceptada);
                solicitud.setMotivo_rechazo_cancelacion(null);
            }
            case rechazar -> {
                solicitud.setEstado(estadoSolicitudModel.rechazada);
                solicitud.setMotivo_rechazo_cancelacion(
                    (dto.getMotivo() == null || dto.getMotivo().isBlank())
                        ? "Contrapropuesta rechazada por el cliente"
                        : dto.getMotivo().trim());
            }
        }

        solicitud.setFecha_actualizacion(LocalDateTime.now());
        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }

    // ============================================
    // HU-017: Cancelación de solicitud o reserva
    // ============================================
    @Transactional
    public solicitudResponseDTO cancelarSolicitud(String email, Integer idSolicitud, cancelarSolicitudDTO dto) {
        usuarioModel usuario = obtenerUsuario(email);
        solicitud_reservaModel solicitud;

        if (usuario.getRol().name().equals("cliente")) {
            clienteModel cliente = obtenerCliente(email);
            solicitud = solicitudReservaRepository.buscarPorIdYCliente(idSolicitud, cliente)
                .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no le pertenece"));
        } else {
            proveedorModel proveedor = obtenerProveedor(email);
            solicitud = solicitudReservaRepository.buscarPorIdYProveedor(idSolicitud, proveedor)
                .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no está dirigida a usted"));
        }

        if (solicitud.getEstado() == estadoSolicitudModel.cancelada
            || solicitud.getEstado() == estadoSolicitudModel.completada
            || solicitud.getEstado() == estadoSolicitudModel.rechazada) {
            throw new estadoSolicitudInvalidoException(
                "No se puede cancelar una solicitud en estado " + solicitud.getEstado());
        }

        solicitud.setEstado(estadoSolicitudModel.cancelada);
        solicitud.setMotivo_rechazo_cancelacion(dto.getMotivo().trim());
        solicitud.setFecha_actualizacion(LocalDateTime.now());

        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }

    // ============================================
    // HU-018: Finalización del servicio
    // ============================================
    @Transactional
    public solicitudResponseDTO completarSolicitud(String email, Integer idSolicitud) {
        proveedorModel proveedor = obtenerProveedor(email);
        solicitud_reservaModel solicitud = solicitudReservaRepository.buscarPorIdYProveedor(idSolicitud, proveedor)
            .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no está dirigida a usted"));

        if (solicitud.getEstado() != estadoSolicitudModel.aceptada) {
            throw new estadoSolicitudInvalidoException(
                "Solo se puede completar una reserva aceptada. Estado actual: " + solicitud.getEstado());
        }

        solicitud.setEstado(estadoSolicitudModel.completada);
        solicitud.setFecha_actualizacion(LocalDateTime.now());

        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }

    // ============================================
    // HU-019: Agenda del Proveedor
    // ============================================
    public List<agendaReservaDTO> consultarAgenda(String email, LocalDateTime desde, LocalDateTime hasta) {
        proveedorModel proveedor = obtenerProveedor(email);
        List<solicitud_reservaModel> reservas;

        if (desde != null && hasta != null) {
            if (desde.isAfter(hasta)) {
                throw new datosInvalidosException("La fecha inicial no puede ser posterior a la fecha final");
            }
            reservas = solicitudReservaRepository.agendaEntre(proveedor, estadoSolicitudModel.aceptada, desde, hasta);
        } else if (desde != null) {
            reservas = solicitudReservaRepository.agendaDesde(proveedor, estadoSolicitudModel.aceptada, desde);
        } else if (hasta != null) {
            reservas = solicitudReservaRepository.agendaHasta(proveedor, estadoSolicitudModel.aceptada, hasta);
        } else {
            reservas = solicitudReservaRepository.agenda(proveedor, estadoSolicitudModel.aceptada);
        }

        return reservas.stream()
            .map(this::convertirAAgendaDTO)
            .collect(Collectors.toList());
    }

    // ============================================
    // Auxiliares
    // ============================================
    private usuarioModel obtenerUsuario(String email) {
        return usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new accesoDenegadoException("Usuario no encontrado"));
    }

    private clienteModel obtenerCliente(String email) {
        usuarioModel usuario = obtenerUsuario(email);
        if (!usuario.getRol().name().equals("cliente")) {
            throw new accesoDenegadoException("Esta operación es exclusiva de clientes");
        }
        return clienteRepository.findByUsuario(usuario)
            .orElseThrow(() -> new accesoDenegadoException("Cliente no encontrado"));
    }

    private proveedorModel obtenerProveedor(String email) {
        usuarioModel usuario = obtenerUsuario(email);
        if (!usuario.getRol().name().equals("proveedor")) {
            throw new accesoDenegadoException("Esta operación es exclusiva de proveedores");
        }
        return proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new accesoDenegadoException("Proveedor no encontrado"));
    }

    private solicitudResponseDTO convertirADTO(solicitud_reservaModel s) {
        return new solicitudResponseDTO(
            s.getId_solicitud(),
            s.getNombre_servicio_snapshot(),
            s.getPrecio_snapshot(),
            s.getDuracion_snapshot_minutos(),
            s.getFecha_hora_solicitada(),
            s.getFecha_hora_propuesta(),
            s.getDireccion_texto(),
            s.getBarrio_sector(),
            s.getInformacion_complementaria(),
            s.getObservaciones(),
            s.getEstado().name(),
            s.getMotivo_rechazo_cancelacion(),
            s.getFecha_creacion(),
            s.getFecha_actualizacion(),
            s.getCliente().getId_cliente(),
            s.getProveedor().getId_proveedor()
        );
    }

    private agendaReservaDTO convertirAAgendaDTO(solicitud_reservaModel s) {
        LocalDateTime inicio = s.getFecha_hora_solicitada();
        LocalDateTime fin = inicio.plusMinutes(s.getDuracion_snapshot_minutos());

        return new agendaReservaDTO(
            s.getId_solicitud(),
            s.getNombre_servicio_snapshot(),
            inicio,
            fin,
            s.getDuracion_snapshot_minutos(),
            s.getDireccion_texto(),
            s.getBarrio_sector(),
            s.getCliente().getUsuario().getNombre(),
            s.getCliente().getUsuario().getApellido(),
            s.getEstado().name()
        );
    }
}
