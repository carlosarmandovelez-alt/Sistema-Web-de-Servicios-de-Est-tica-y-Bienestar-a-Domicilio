package com.backend.backend.Service;

import com.backend.backend.DTO.agendaResponseDTO;
import com.backend.backend.DTO.crearSolicitudDTO;
import com.backend.backend.DTO.solicitudResponseDTO;
import com.backend.backend.Exception.disponibilidadException;
import com.backend.backend.Exception.estadoInvalidoException;
import com.backend.backend.Exception.horarioInvalidoException;
import com.backend.backend.Exception.servicioNoEncontradoException;
import com.backend.backend.Exception.solicitudNoEncontradaException;
import com.backend.backend.Model.*;
import com.backend.backend.Model.enums.diaSemanaModel;
import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.enums.estadoSolicitudModel;
import com.backend.backend.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class solicitudService {

    private static final DateTimeFormatter FORMATO_HORA = DateTimeFormatter.ofPattern("HH:mm");

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


    // HU-012: Crear Solicitud
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

        // 3. Validar disponibilidad del proveedor (CA-03 y CA-04).
        // Se valida el bloque completo: inicio + duración del servicio.
        validarDisponibilidad(servicio.getProveedor(), dto.getFecha_hora_solicitada(), servicio.getDuracion_minutos());

        //validar horas terminando en 00 o 30
        int minutos = dto.getFecha_hora_solicitada().getMinute();
        if (minutos != 0 && minutos != 30) {
            throw new horarioInvalidoException("Las reservas solo pueden ser en punto o a la media hora (:00 o :30).");
        }

        //solapamiento
        validarSolapamientoEnCreacion(servicio.getProveedor(), dto.getFecha_hora_solicitada(), servicio.getDuracion_minutos());

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


    // HU-013: Listar solicitudes del Cliente (CA-01, CA-05, CA-07)

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

    // HU-013: Detalle de una solicitud (CA-02, CA-03, CA-04, CA-06)

    public solicitudResponseDTO consultarDetalleSolicitud(String emailCliente, Integer idSolicitud) {
        usuarioModel usuario = usuarioRepository.findByEmail(emailCliente)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        clienteModel cliente = clienteRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));


        solicitud_reservaModel solicitud = solicitudReservaRepository.buscarPorIdYCliente(idSolicitud, cliente)
            .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no tiene permiso para verla"));

        return convertirADTO(solicitud);
    }


    // HU-014: Listar solicitudes recibidas (CA-01, CA-02, CA-03, CA-04)

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


    // HU-014: Detalle de una solicitud recibida (CA-02, CA-03, CA-04, CA-05)
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


    // Lógica de Validación (CA-03 y CA-04)

    /**
     * Valida que la solicitud completa (inicio + duración conservada) quepa
     * dentro de la disponibilidad habitual del Proveedor y fuera de sus
     * periodos de excepción.
     *
     * HU-012 exige comprobar el bloque completo de atención, no solo la hora
     * de inicio: una cita de 60 minutos a las 10:30 no es válida si el
     * Proveedor atiende hasta las 11:00.
     */
    private void validarDisponibilidad(proveedorModel proveedor, LocalDateTime fechaSolicitada, Integer duracionMinutos) {
        if (fechaSolicitada == null) {
            throw new disponibilidadException("La fecha y hora de la solicitud es obligatoria");
        }

        LocalDate fecha = fechaSolicitada.toLocalDate();
        LocalTime hora = fechaSolicitada.toLocalTime();

        int duracion = (duracionMinutos == null || duracionMinutos < 0) ? 0 : duracionMinutos;
        LocalTime horaFin = hora.plusMinutes(duracion);

        // La disponibilidad se define dentro de un mismo día (hora_inicio <
        // hora_fin), por lo que un servicio que termina al día siguiente nunca
        // puede caber en el horario habitual.
        boolean cruzaMedianoche = duracion > 0 && !horaFin.isAfter(hora);

        // 1. Verificar periodos no disponibles (ej. vacaciones)
        List<periodoNoDisponibleModel> periodos = periodoNoDisponibleRepository.findByProveedor(proveedor);
        for (periodoNoDisponibleModel periodo : periodos) {
            if (!fecha.isBefore(periodo.getFecha_inicio()) && !fecha.isAfter(periodo.getFecha_fin())) {
                throw new disponibilidadException("El proveedor no está disponible en la fecha seleccionada (periodo no disponible)");
            }
        }

        // 2. Verificar día de la semana y horario habitual
        diaSemanaModel diaEnum = traducirDiaSemanaEnum(fecha.getDayOfWeek().name());

        List<disponibilidadModel> disponibilidades = disponibilidadRepository.findByProveedor(proveedor);

        boolean inicioDentroDeHorario = false;
        boolean duracionDentroDeHorario = false;

        for (disponibilidadModel disp : disponibilidades) {
            if (disp.getDia_semana() != diaEnum) {
                continue;
            }

            // El inicio debe estar dentro del rango [hora_inicio, hora_fin)
            if (hora.isBefore(disp.getHora_inicio()) || !hora.isBefore(disp.getHora_fin())) {
                continue;
            }

            inicioDentroDeHorario = true;

            // La hora de finalización del servicio debe caber en el mismo rango
            if (!cruzaMedianoche && !horaFin.isAfter(disp.getHora_fin())) {
                duracionDentroDeHorario = true;
                break;
            }
        }

        if (!inicioDentroDeHorario) {
            throw new disponibilidadException("El horario solicitado no se encuentra dentro de la disponibilidad del proveedor");
        }

        if (!duracionDentroDeHorario) {
            throw new disponibilidadException(
                "El horario solicitado no se encuentra dentro de la disponibilidad del proveedor: " +
                "el servicio de " + duracion + " minutos terminaría a las " +
                horaFin.format(FORMATO_HORA) +
                ", fuera del horario de atención."
            );
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


    // Método Auxiliar para convertir a DTO
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

    // Método auxiliar para obtener el proveedor desde el token
    private proveedorModel obtenerProveedorPorEmail(String email) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        return proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));
    }


    // HU-015: Aceptar Solicitud (CA-01, CA-02, CA-03)

    /**
     * CA-11: la aceptación se ejecuta en una transacción READ_COMMITTED y
     * comienza bloqueando la fila del Proveedor con un bloqueo pesimista.
     *
     * - El bloqueo serializa todas las aceptaciones del mismo Proveedor: si
     *   dos solicitudes distintas se aceptan a la vez, la segunda espera a que
     *   la primera confirme y luego revalida el solapamiento ya con la reserva
     *   visible, por lo que como máximo una queda Aceptada.
     * - READ_COMMITTED evita que una lectura repetible use una "foto" anterior
     *   al commit de la otra transacción.
     * - Cualquier excepción de negocio es una RuntimeException, por lo que la
     *   transacción completa hace rollback (CA-12).
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public solicitudResponseDTO aceptarSolicitud(String emailProveedor, Integer idSolicitud) {
        // 1. Identidad del Proveedor desde el JWT y bloqueo de su fila.
        proveedorModel proveedorRef = obtenerProveedorPorEmail(emailProveedor);
        proveedorModel proveedor = proveedorRepository.buscarPorIdConBloqueo(proveedorRef.getId_proveedor())
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));

        // 2. Propiedad y estado Pendiente (lectura con bloqueo de la solicitud).
        solicitud_reservaModel solicitud = obtenerSolicitudPendienteDelProveedor(idSolicitud, proveedor);

        // 3. Revalidar que el horario siga estando disponible (CA-02).
        validarDisponibilidad(proveedor, solicitud.getFecha_hora_solicitada(), solicitud.getDuracion_snapshot_minutos());

        // 4. Validar solapamiento con reservas aceptadas (CA-03).
        validarSolapamiento(proveedor, solicitud.getFecha_hora_solicitada(), solicitud.getDuracion_snapshot_minutos());

        // 5. Cambiar estado (CA-01).
        solicitud.setEstado(estadoSolicitudModel.aceptada);
        solicitud.setFecha_actualizacion(LocalDateTime.now());
        
        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }


    // HU-015: Rechazar Solicitud (CA-04, CA-05)
    @Transactional
    public solicitudResponseDTO rechazarSolicitud(String emailProveedor, Integer idSolicitud, String motivo) {
        proveedorModel proveedor = obtenerProveedorPorEmail(emailProveedor);
        solicitud_reservaModel solicitud = obtenerSolicitudPendienteDelProveedor(idSolicitud, proveedor);

        if (motivo == null || motivo.trim().isEmpty()) {
            throw new disponibilidadException("El motivo de rechazo es obligatorio"); // CA-05
        }

        solicitud.setEstado(estadoSolicitudModel.rechazada);
        solicitud.setMotivo_rechazo_cancelacion(motivo.trim());
        solicitud.setFecha_actualizacion(LocalDateTime.now());
        
        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }

    // HU-015: Proponer otro horario (CA-06, CA-07)

    @Transactional
    public solicitudResponseDTO proponerHorario(String emailProveedor, Integer idSolicitud, LocalDateTime nuevaFecha) {
        proveedorModel proveedor = obtenerProveedorPorEmail(emailProveedor);
        solicitud_reservaModel solicitud = obtenerSolicitudPendienteDelProveedor(idSolicitud, proveedor);

        if (nuevaFecha == null) {
            throw new horarioInvalidoException("La nueva fecha y hora es obligatoria");
        }

        // CA-06: la propuesta debe ser un horario diferente al solicitado.
        if (nuevaFecha.withNano(0).equals(solicitud.getFecha_hora_solicitada().withNano(0))) {
            throw new horarioInvalidoException(
                "La nueva fecha y hora debe ser diferente a la fecha y hora solicitada por el Cliente");
        }

        // Validar que el nuevo horario esté en la disponibilidad (CA-06, CA-07)
        validarDisponibilidad(proveedor, nuevaFecha, solicitud.getDuracion_snapshot_minutos());

        solicitud.setEstado(estadoSolicitudModel.sugerida);
        solicitud.setFecha_hora_propuesta(nuevaFecha);
        solicitud.setFecha_actualizacion(LocalDateTime.now());
        
        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }



    // HU-016: Aceptar contrapropuesta (Cliente) - CA-01, CA-02, CA-03

    /**
     * HU-016 (CA-09): la confirmación del Cliente bloquea primero la fila del
     * Proveedor y después relee la solicitud con bloqueo, dentro de una
     * transacción READ_COMMITTED, igual que la aceptación del Proveedor.
     *
     * Así, si dos Clientes aceptan contrapropuestas solapadas del mismo
     * Proveedor a la vez, la segunda transacción espera a que la primera
     * confirme y vuelve a consultar las reservas aceptadas ya con la reserva
     * visible, por lo que falla por solapamiento y permanece Sugerida.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public solicitudResponseDTO aceptarContrapropuesta(String emailCliente, Integer idSolicitud) {
        clienteModel cliente = obtenerClientePorEmail(emailCliente);

        // 1. Lectura inicial para conocer el Proveedor cuya fila se bloqueará.
        solicitud_reservaModel referencia = solicitudReservaRepository.buscarPorIdYCliente(idSolicitud, cliente)
            .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no le pertenece"));
        proveedorModel proveedor = referencia.getProveedor();

        // 2. Bloqueo pesimista del Proveedor: serializa sus confirmaciones.
        proveedorRepository.buscarPorIdConBloqueo(proveedor.getId_proveedor())
            .orElseThrow(() -> new RuntimeException("Proveedor no encontrado"));

        // 3. Relectura bloqueada y validación del estado Sugerida.
        solicitud_reservaModel solicitud = obtenerSolicitudSugeridaDelCliente(idSolicitud, cliente);

        // 4. Revalidar disponibilidad y solapamiento con el horario propuesto.
        validarDisponibilidad(solicitud.getProveedor(), solicitud.getFecha_hora_propuesta(), solicitud.getDuracion_snapshot_minutos());
        validarSolapamiento(solicitud.getProveedor(), solicitud.getFecha_hora_propuesta(), solicitud.getDuracion_snapshot_minutos());

        // 5. Confirmar: el horario propuesto pasa a ser el horario de la reserva.
        solicitud.setEstado(estadoSolicitudModel.aceptada);
        solicitud.setFecha_hora_solicitada(solicitud.getFecha_hora_propuesta());
        solicitud.setFecha_actualizacion(LocalDateTime.now());
        
        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }


    // HU-016: Rechazar contrapropuesta (Cliente)
    @Transactional
    public solicitudResponseDTO rechazarContrapropuesta(String emailCliente, Integer idSolicitud, String motivo) {
        clienteModel cliente = obtenerClientePorEmail(emailCliente);
        solicitud_reservaModel solicitud = obtenerSolicitudSugeridaDelCliente(idSolicitud, cliente);

        // HU-016 no exige motivo; si el Cliente lo envía, se conserva.
        solicitud.setEstado(estadoSolicitudModel.cancelada);
        if (motivo != null && !motivo.trim().isEmpty()) {
            solicitud.setMotivo_rechazo_cancelacion(motivo.trim());
        }
        solicitud.setFecha_actualizacion(LocalDateTime.now());
        
        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }


    // Métodos Auxiliares para HU-016
    private clienteModel obtenerClientePorEmail(String email) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return clienteRepository.findByUsuario(usuario)
            .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
    }

    private solicitud_reservaModel obtenerSolicitudSugeridaDelCliente(Integer idSolicitud, clienteModel cliente) {
        // La lectura bloquea la fila: aceptar y rechazar la misma
        // contrapropuesta se serializan y la segunda ve el estado confirmado.
        solicitud_reservaModel solicitud = solicitudReservaRepository.buscarPorIdYClienteConBloqueo(idSolicitud, cliente)
            .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no le pertenece"));

        if (solicitud.getEstado() != estadoSolicitudModel.sugerida) {
            throw new estadoInvalidoException(
                "La solicitud ya no se encuentra en estado Sugerida y no admite respuestas a la contrapropuesta");
        }
        return solicitud;
    }


    // MÉTODOS AUXILIARES PARA HU-015
    private solicitud_reservaModel obtenerSolicitudPendienteDelProveedor(Integer idSolicitud, proveedorModel proveedor) {
        // La lectura bloquea la fila de la solicitud: si dos respuestas del
        // Proveedor compiten por la misma solicitud, se serializan y la
        // segunda ya observa el estado confirmado por la primera (CA-10).
        solicitud_reservaModel solicitud = solicitudReservaRepository.buscarPorIdYProveedorConBloqueo(idSolicitud, proveedor)
            .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no está dirigida a usted (CA-08)"));

        if (solicitud.getEstado() != estadoSolicitudModel.pendiente) {
            throw new estadoInvalidoException(
                "La solicitud ya fue procesada o no admite nuevas respuestas (CA-10)");
        }
        return solicitud;
    }

    private void validarSolapamiento(proveedorModel proveedor, LocalDateTime fechaInicio, Integer duracionMinutos) {
        LocalDateTime fechaFin = fechaInicio.plusMinutes(duracionMinutos);
        List<solicitud_reservaModel> reservasAceptadas = solicitudReservaRepository.findReservasAceptadasByProveedor(proveedor);

        for (solicitud_reservaModel reserva : reservasAceptadas) {
            LocalDateTime inicioReserva = reserva.getFecha_hora_solicitada();
            LocalDateTime finReserva = inicioReserva.plusMinutes(reserva.getDuracion_snapshot_minutos());

            // Lógica de solapamiento: (InicioA < FinB) y (FinA > InicioB)
            if (fechaInicio.isBefore(finReserva) && fechaFin.isAfter(inicioReserva)) {
                throw new disponibilidadException("El horario se cruza con otra reserva aceptada (CA-03)");
            }
        }
    }


    private void validarSolapamientoEnCreacion(proveedorModel proveedor, LocalDateTime fechaInicio, Integer duracionMinutos) {
        LocalDateTime fechaFin = fechaInicio.plusMinutes(duracionMinutos);
        
        // Buscamos TODAS las solicitudes del proveedor
        List<solicitud_reservaModel> todasLasSolicitudes = solicitudReservaRepository.findByProveedor(proveedor);

        for (solicitud_reservaModel s : todasLasSolicitudes) {
            // Solo evaluamos las que bloquean el horario (Pendiente, Sugerida, Aceptada)
            if (s.getEstado() == estadoSolicitudModel.pendiente || 
                s.getEstado() == estadoSolicitudModel.sugerida || 
                s.getEstado() == estadoSolicitudModel.aceptada) {
                
                LocalDateTime inicioReserva = s.getFecha_hora_solicitada();
                
                // Si la solicitud está "Sugerida", el bloqueo real es sobre la fecha propuesta
                if (s.getEstado() == estadoSolicitudModel.sugerida && s.getFecha_hora_propuesta() != null) {
                    inicioReserva = s.getFecha_hora_propuesta();
                }

                LocalDateTime finReserva = inicioReserva.plusMinutes(s.getDuracion_snapshot_minutos());

                // Lógica de solapamiento
                if (fechaInicio.isBefore(finReserva) && fechaFin.isAfter(inicioReserva)) {
                    throw new disponibilidadException("El horario seleccionado ya está reservado o tiene una solicitud pendiente en proceso.");
                }
            }
        }
    }


    // HU-017: Cancelar solicitud o reserva
    @Transactional
    public solicitudResponseDTO cancelarSolicitud(String email, String rol, Integer idSolicitud, String motivo) {
        // 1. Validar que el motivo sea obligatorio (CA-05)
        if (motivo == null || motivo.trim().isEmpty()) {
            throw new disponibilidadException("El motivo de cancelación es obligatorio");
        }

        solicitud_reservaModel solicitud;

        // 2. Buscar la solicitud dependiendo del rol y validar propiedad (CA-06)
        if (rol.equals("cliente")) {
            clienteModel cliente = obtenerClientePorEmail(email);
            solicitud = solicitudReservaRepository.buscarPorIdYCliente(idSolicitud, cliente)
                .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no le pertenece"));
        } else {
            proveedorModel proveedor = obtenerProveedorPorEmail(email);
            solicitud = solicitudReservaRepository.buscarPorIdYProveedor(idSolicitud, proveedor)
                .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no le pertenece"));
        }

        // 3. Validar estados permitidos (CA-07 y CA-08)
        if (solicitud.getEstado() == estadoSolicitudModel.completada) {
            throw new estadoInvalidoException("No se puede cancelar una reserva que ya fue completada");
        }
        if (solicitud.getEstado() == estadoSolicitudModel.cancelada) {
            throw new estadoInvalidoException("La solicitud ya se encuentra cancelada");
        }
        if (solicitud.getEstado() == estadoSolicitudModel.rechazada) {
            throw new estadoInvalidoException("No se puede cancelar una solicitud que ya fue rechazada");
        }

        // 4. Realizar la cancelación (CA-01, CA-02, CA-03, CA-04)
        solicitud.setEstado(estadoSolicitudModel.cancelada);
        solicitud.setMotivo_rechazo_cancelacion(motivo);
        solicitud.setFecha_actualizacion(LocalDateTime.now());
        
        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }



    // HU-018: Finalizar servicio (Completar reserva)
    @Transactional
    public solicitudResponseDTO completarServicio(String emailProveedor, Integer idSolicitud) {
        // 1. Obtener el proveedor autenticado
        proveedorModel proveedor = obtenerProveedorPorEmail(emailProveedor);

        // 2. Buscar la solicitud y validar que le pertenezca al proveedor (CA-03)
        solicitud_reservaModel solicitud = solicitudReservaRepository.buscarPorIdYProveedor(idSolicitud, proveedor)
            .orElseThrow(() -> new solicitudNoEncontradaException("La solicitud no existe o no está dirigida a usted"));

        // 3. Validar que la reserva esté en estado ACEPTADA (CA-02)
        if (solicitud.getEstado() != estadoSolicitudModel.aceptada) {
            throw new estadoInvalidoException("Solo se pueden completar reservas que estén en estado Aceptada");
        }

        // 4. Cambiar el estado a COMPLETADA (CA-01)
        solicitud.setEstado(estadoSolicitudModel.completada);
        solicitud.setFecha_actualizacion(LocalDateTime.now());
        
        return convertirADTO(solicitudReservaRepository.save(solicitud));
    }


    // HU-019: Consultar Agenda del Proveedor
    public List<agendaResponseDTO> consultarAgenda(String emailProveedor) {
        // 1. Obtener el proveedor autenticado (esto ya valida CA-05 y CA-06 por seguridad)
        proveedorModel proveedor = obtenerProveedorPorEmail(emailProveedor);

        // 2. Obtener las reservas aceptadas ordenadas (CA-01)
        List<solicitud_reservaModel> reservas = solicitudReservaRepository.findAgendaAceptadaByProveedor(proveedor);

        // 3. Mapear al DTO calculando la hora de fin (CA-02 y CA-03)
        return reservas.stream().map(reserva -> {
            // Cálculo de la hora de finalización
            LocalDateTime horaFin = reserva.getFecha_hora_solicitada().plusMinutes(reserva.getDuracion_snapshot_minutos());

            return new agendaResponseDTO(
                reserva.getId_solicitud(),
                reserva.getNombre_servicio_snapshot(),
                reserva.getFecha_hora_solicitada(),
                horaFin,
                reserva.getCliente().getUsuario().getNombre() + " " + reserva.getCliente().getUsuario().getApellido(),
                reserva.getDireccion_texto(),
                reserva.getBarrio_sector()
            );
        }).collect(java.util.stream.Collectors.toList());
    }
}