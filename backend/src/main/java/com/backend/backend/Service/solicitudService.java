package com.backend.backend.Service;

import com.backend.backend.DTO.crearSolicitudDTO;
import com.backend.backend.DTO.solicitudResponseDTO;
import com.backend.backend.Exception.disponibilidadException;
import com.backend.backend.Exception.servicioNoEncontradoException;
import com.backend.backend.Exception.solicitudNoEncontradaException;
import com.backend.backend.Model.*;
import com.backend.backend.Model.enums.diaSemanaModel;
import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.enums.estadoSolicitudModel;
import com.backend.backend.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

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
    private disponibilidadRepository disponibilidadRepository;

    @Autowired
    private periodoNoDisponibleRepository periodoNoDisponibleRepository;

    @Autowired
    private proveedorRepository proveedorRepository;

    // ============================================
    // HU-012: Crear Solicitud
    // ============================================
    @Transactional
    public solicitudResponseDTO crearSolicitud(String emailCliente, crearSolicitudDTO dto) {
        // 1. Obtener al cliente autenticado
        usuarioModel usuario = usuarioRepository.findByEmail(emailCliente)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        clienteModel cliente = clienteRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        // 2. Obtener el servicio
        servicioModel servicio = servicioRepository.findById(dto.getId_servicio())
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe"));

        // Validar que el servicio esté activo
        if (servicio.getEstado() != estadoServicioModel.activo) {
            throw new disponibilidadException("El servicio no se encuentra disponible");
        }

        // 3. Validar disponibilidad del proveedor (CA-03 y CA-04)
        validarDisponibilidad(servicio.getProveedor(), dto.getFecha_hora_solicitada());

        // 4. Crear la solicitud y guardar el snapshot (CA-05 y CA-06)
        solicitud_reservaModel solicitud = new solicitud_reservaModel();
        solicitud.setServicio(servicio);
        solicitud.setCliente(cliente);
        solicitud.setProveedor(servicio.getProveedor());
        
        // Guardamos el snapshot del servicio
        solicitud.setNombre_servicio_snapshot(servicio.getNombre());
        solicitud.setPrecio_snapshot(servicio.getPrecio());
        solicitud.setDuracion_snapshot_minutos(servicio.getDuracion_minutos());
        
        // Datos de la solicitud
        solicitud.setFecha_hora_solicitada(dto.getFecha_hora_solicitada());
        solicitud.setDireccion_texto(dto.getDireccion_texto());
        solicitud.setBarrio_sector(dto.getBarrio_sector());
        solicitud.setInformacion_complementaria(dto.getInformacion_complementaria());
        solicitud.setObservaciones(dto.getObservaciones());
        
        // CA-08: Estado inicial
        solicitud.setEstado(estadoSolicitudModel.pendiente);
        solicitud.setFecha_creacion(LocalDateTime.now());
        solicitud.setFecha_actualizacion(LocalDateTime.now());

        solicitud_reservaModel guardada = solicitudReservaRepository.save(solicitud);

        return convertirADTO(guardada);
    }

        // ============================================
    // HU-013: Listar solicitudes del Cliente (CA-01, CA-05, CA-07)
    // ============================================
    public List<solicitudResponseDTO> listarSolicitudesCliente(String emailCliente) {
        usuarioModel usuario = usuarioRepository.findByEmail(emailCliente)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        clienteModel cliente = clienteRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        List<solicitud_reservaModel> solicitudes = solicitudReservaRepository.findByCliente(cliente);

        // Convertimos a DTO (Si la lista está vacía, devolverá una lista vacía [])
        return solicitudes.stream()
            .map(this::convertirADTO)
            .collect(java.util.stream.Collectors.toList());
    }

    // ============================================
    // HU-013: Detalle de una solicitud (CA-02, CA-03, CA-04, CA-06)
    // ============================================
    public solicitudResponseDTO consultarDetalleSolicitud(String emailCliente, Integer idSolicitud) {
        usuarioModel usuario = usuarioRepository.findByEmail(emailCliente)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        clienteModel cliente = clienteRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));


        solicitud_reservaModel solicitud = solicitudReservaRepository.buscarPorIdYCliente(idSolicitud, cliente)
            .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no tiene permiso para verla"));

        return convertirADTO(solicitud);
    }


        // ============================================
    // HU-014: Listar solicitudes recibidas (CA-01, CA-02, CA-03, CA-04)
    // ============================================
    public List<solicitudResponseDTO> listarSolicitudesProveedor(String emailProveedor) {
        usuarioModel usuario = usuarioRepository.findByEmail(emailProveedor)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        proveedorModel proveedor = proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));

        List<solicitud_reservaModel> solicitudes = solicitudReservaRepository.findByProveedor(proveedor);

        return solicitudes.stream()
            .map(this::convertirADTO)
            .collect(java.util.stream.Collectors.toList());
    }

    // ============================================
    // HU-014: Detalle de una solicitud recibida (CA-02, CA-03, CA-04, CA-05)
    // ============================================
    public solicitudResponseDTO consultarDetalleRecibida(String emailProveedor, Integer idSolicitud) {
        usuarioModel usuario = usuarioRepository.findByEmail(emailProveedor)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        proveedorModel proveedor = proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));

        // Validamos que la solicitud le pertenezca al proveedor (CA-05)
        solicitud_reservaModel solicitud = solicitudReservaRepository.buscarPorIdYProveedor(idSolicitud, proveedor)
            .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no está dirigida a usted"));

        // El DTO ya incluye dirección, snapshot y estado (CA-02, CA-03, CA-04)
        return convertirADTO(solicitud);
    }

    // ============================================
    // Lógica de Validación (CA-03 y CA-04)
    // ============================================
    private void validarDisponibilidad(proveedorModel proveedor, LocalDateTime fechaSolicitada) {
        LocalDate fecha = fechaSolicitada.toLocalDate();
        LocalTime hora = fechaSolicitada.toLocalTime();

        // 1. Verificar periodos no disponibles (ej. vacaciones)
        List<periodoNoDisponibleModel> periodos = periodoNoDisponibleRepository.findByProveedor(proveedor);
        for (periodoNoDisponibleModel periodo : periodos) {
            if (!fecha.isBefore(periodo.getFecha_inicio()) && !fecha.isAfter(periodo.getFecha_fin())) {
                throw new disponibilidadException("El proveedor no está disponible en la fecha seleccionada (periodo no disponible)");
            }
        }

        // 2. Verificar día de la semana y horario
        diaSemanaModel diaEnum = traducirDiaSemanaEnum(fecha.getDayOfWeek().name());
        
        List<disponibilidadModel> disponibilidades = disponibilidadRepository.findByProveedor(proveedor);
        boolean horarioValido = false;

        for (disponibilidadModel disp : disponibilidades) {
            if (disp.getDia_semana() == diaEnum) {
                // Verifica si la hora está dentro del rango (hora inicio <= hora solicitada < hora fin)
                if (!hora.isBefore(disp.getHora_inicio()) && hora.isBefore(disp.getHora_fin())) {
                    horarioValido = true;
                    break;
                }
            }
        }

        if (!horarioValido) {
            throw new disponibilidadException("El horario solicitado no se encuentra dentro de la disponibilidad del proveedor");
        }
    }

    // Método auxiliar para traducir el día de Java al Enum de la BD
    private diaSemanaModel traducirDiaSemanaEnum(String diaIngles) {
        switch (diaIngles) {
            case "MONDAY": return diaSemanaModel.lunes;
            case "TUESDAY": return diaSemanaModel.martes;
            case "WEDNESDAY": return diaSemanaModel.miercoles;
            case "THURSDAY": return diaSemanaModel.jueves;
            case "FRIDAY": return diaSemanaModel.viernes;
            case "SATURDAY": return diaSemanaModel.sabado;
            case "SUNDAY": return diaSemanaModel.domingo;
            default: throw new disponibilidadException("Día de la semana no válido");
        }
    }

    // ============================================
    // Método Auxiliar para convertir a DTO
    // ============================================
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
}