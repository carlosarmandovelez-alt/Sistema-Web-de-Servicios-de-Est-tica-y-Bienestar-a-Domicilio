package com.backend.backend.Service;

import com.backend.backend.DTO.*;
import com.backend.backend.Exception.disponibilidadException;
import com.backend.backend.Exception.proveedorNoEncontradoException;
import com.backend.backend.Exception.servicioNoEncontradoException;
import com.backend.backend.Model.disponibilidadModel;
import com.backend.backend.Model.enums.diaSemanaModel;
import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.enums.estadoSolicitudModel;
import com.backend.backend.Model.periodoNoDisponibleModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.servicio_insumoModel;
import com.backend.backend.Model.servicioModel;
import com.backend.backend.Model.servicio_multimediaModel;
import com.backend.backend.Model.solicitud_reservaModel;
import com.backend.backend.Model.zona_coberturaModel;
import com.backend.backend.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

@Service
public class exploracionService {
    
    @Autowired
    private proveedorRepository proveedorRepository;
    
    @Autowired
    private servicioRepository servicioRepository;
    
    @Autowired
    private zonaCoberturaRepository zonaCoberturaRepository;
    
    @Autowired
    private servicioMultimediaRepository servicioMultimediaRepository;
    
    @Autowired
    private servicioInsumoRepository servicioInsumoRepository;

    @Autowired
    private disponibilidadRepository disponibilidadRepository;

    @Autowired
    private periodoNoDisponibleRepository periodoNoDisponibleRepository;

    @Autowired
    private solicitudReservaRepository solicitudReservaRepository;

    // HU-009: Exploración de proveedores y servicios

    
    // CA-01: Consultar proveedores disponibles
    public List<proveedorListadoDTO> consultarProveedores() {
        List<proveedorModel> proveedores = proveedorRepository.findProveedoresConServiciosActivos();
        
        return proveedores.stream()
            .map(p -> new proveedorListadoDTO(
                p.getId_proveedor(),
                p.getUsuario().getNombre(),
                p.getUsuario().getApellido(),
                p.getPerfil_profesional()
            ))
            .collect(Collectors.toList());
    }
    
    // Listar todos los servicios activos
    public List<servicioListadoDTO> listarServicios() {
        List<servicioModel> servicios = servicioRepository.findByEstado(estadoServicioModel.activo);
        return convertirLista(servicios);
    }
    
    // CA-02: Búsqueda por categoría
    public List<servicioListadoDTO> buscarPorCategoria(Integer idCategoria) {
        List<servicioModel> servicios = servicioRepository.buscarPorCategoriaYEstado(
            estadoServicioModel.activo, idCategoria);
        
        return convertirLista(servicios);
    }
    
    // CA-03: Búsqueda por nombre
    public List<servicioListadoDTO> buscarPorNombre(String nombre) {
        List<servicioModel> servicios = servicioRepository.buscarPorNombreYEstado(
            estadoServicioModel.activo, nombre);
        
        return convertirLista(servicios);
    }
    
    private List<servicioListadoDTO> convertirLista(List<servicioModel> servicios) {
        return servicios.stream()
            .map(s -> new servicioListadoDTO(
                s.getId_servicio(),
                s.getNombre(),
                s.getCategoria().getNombre(),
                s.getDescripcion(),
                s.getDuracion_minutos(),
                s.getPrecio(),
                s.getProveedor().getId_proveedor(),
                s.getProveedor().getUsuario().getNombre() + " " + s.getProveedor().getUsuario().getApellido()
            ))
            .collect(Collectors.toList());
    }
    

    // HU-010: Consulta del perfil del proveedor y detalle del servicio

    
    // CA-01, CA-02, CA-03: Consultar perfil del proveedor
    public proveedorDetalleDTO consultarPerfilProveedor(Integer idProveedor) {
        proveedorModel proveedor = proveedorRepository.findById(idProveedor)
            .orElseThrow(() -> new proveedorNoEncontradoException("El proveedor no fue encontrado"));
        
        // Zonas de atención
        List<zona_coberturaModel> zonas = zonaCoberturaRepository.findByProveedor(proveedor);
        List<zonaCoberturaDTO> zonasDTO = zonas.stream()
            .map(z -> new zonaCoberturaDTO(z.getCiudad(), z.getBarrio_sector()))
            .collect(Collectors.toList());
        
        // Catálogo (solo servicios activos)
        List<servicioModel> servicios = servicioRepository.findByProveedor(proveedor).stream()
            .filter(s -> s.getEstado() == estadoServicioModel.activo)
            .collect(Collectors.toList());
        
        List<servicioListadoDTO> catalogo = servicios.stream()
            .map(s -> new servicioListadoDTO(
                s.getId_servicio(),
                s.getNombre(),
                s.getCategoria().getNombre(),
                s.getDescripcion(),
                s.getDuracion_minutos(),
                s.getPrecio(),
                proveedor.getId_proveedor(),
                proveedor.getUsuario().getNombre() + " " + proveedor.getUsuario().getApellido()
            ))
            .collect(Collectors.toList());
        
        return new proveedorDetalleDTO(
            proveedor.getId_proveedor(),
            proveedor.getUsuario().getNombre(),
            proveedor.getUsuario().getApellido(),
            proveedor.getPerfil_profesional(),
            zonasDTO,
            catalogo
        );
    }
    
    // CA-04, CA-05: Consultar detalle del servicio
    public servicioDetalleDTO consultarDetalleServicio(Integer idServicio) {
        servicioModel servicio = servicioRepository.findById(idServicio)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no fue encontrado"));
        
        // Multimedia
        List<servicio_multimediaModel> multimedia = servicioMultimediaRepository.findByServicio(servicio);
        List<MultimediaDTO> multimediaDTO = multimedia.stream()
            .map(m -> new MultimediaDTO(
                m.getId_multimedia(),
                m.getTipo_archivo().name(),
                m.getUrl_archivo(),
                m.getOrden()
            ))
            .collect(Collectors.toList());
        
        // Insumos
        List<servicio_insumoModel> insumos = servicioInsumoRepository.findByServicio(servicio);
        List<InsumoDTO> insumosDTO = insumos.stream()
            .map(i -> new InsumoDTO(
                i.getId_insumo(),
                i.getNombre(),
                i.getTipo().name()
            ))
            .collect(Collectors.toList());
        
        return new servicioDetalleDTO(
            servicio.getId_servicio(),
            servicio.getNombre(),
            servicio.getCategoria().getNombre(),
            servicio.getDescripcion(),
            servicio.getDuracion_minutos(),
            servicio.getPrecio(),
            servicio.getProveedor().getId_proveedor(),
            servicio.getProveedor().getUsuario().getNombre() + " " + servicio.getProveedor().getUsuario().getApellido(),
            multimediaDTO,
            insumosDTO
        );
    }

    // HU-012: disponibilidad del Proveedor para una fecha concreta

    /**
     * Calcula las horas de inicio que el Cliente puede elegir para un servicio
     * en una fecha determinada, respetando las mismas reglas que la creación de
     * solicitudes (HU-011 y HU-012):
     *
     * - franjas habituales del día (cada 30 minutos),
     * - periodos de excepción (fechas inclusivas),
     * - duración real del servicio (se usa la del catálogo, que es la que se
     *   conservará en el snapshot al crear la solicitud),
     * - solicitudes pendientes, sugeridas o aceptadas que ya bloquean el
     *   horario (misma regla de solapamiento que la creación),
     * - horas de inicio futuras.
     *
     * Es solo una vista previa: al crear la solicitud el backend vuelve a
     * validar todo.
     */
    public disponibilidadPublicaDTO consultarDisponibilidadProveedor(Integer idProveedor,
                                                                    Integer idServicio,
                                                                    LocalDate fecha) {
        if (fecha == null) {
            throw new disponibilidadException("La fecha es obligatoria");
        }

        proveedorModel proveedor = proveedorRepository.findById(idProveedor)
            .orElseThrow(() -> new proveedorNoEncontradoException("El proveedor no fue encontrado"));

        servicioModel servicio = servicioRepository.findById(idServicio)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no fue encontrado"));

        if (servicio.getProveedor() == null
                || !servicio.getProveedor().getId_proveedor().equals(proveedor.getId_proveedor())) {
            throw new disponibilidadException("El servicio no pertenece al proveedor indicado");
        }

        diaSemanaModel dia = traducirDiaSemana(fecha.getDayOfWeek());

        if (servicio.getEstado() != estadoServicioModel.activo) {
            return respuesta(proveedor, servicio, fecha, dia, false, "SERVICIO_NO_DISPONIBLE",
                Collections.emptyList(), Collections.emptyList());
        }

        // 1. Periodos de excepción: si la fecha cae dentro, no se atiende.
        for (periodoNoDisponibleModel periodo : periodoNoDisponibleRepository.findByProveedor(proveedor)) {
            if (!fecha.isBefore(periodo.getFecha_inicio()) && !fecha.isAfter(periodo.getFecha_fin())) {
                return respuesta(proveedor, servicio, fecha, dia, false, "PERIODO_NO_DISPONIBLE",
                    Collections.emptyList(), Collections.emptyList());
            }
        }

        // 2. Franjas habituales del día solicitado.
        List<disponibilidadModel> franjas = disponibilidadRepository.findByProveedor(proveedor).stream()
            .filter(f -> f.getDia_semana() == dia)
            .collect(Collectors.toList());

        if (franjas.isEmpty()) {
            return respuesta(proveedor, servicio, fecha, dia, false, "SIN_DISPONIBILIDAD_DIA",
                Collections.emptyList(), Collections.emptyList());
        }

        int duracion = servicio.getDuracion_minutos() == null ? 0 : servicio.getDuracion_minutos();
        if (duracion <= 0) {
            return respuesta(proveedor, servicio, fecha, dia, true, "SIN_HORARIOS_SUFICIENTES",
                Collections.emptyList(), Collections.emptyList());
        }

        // 3. Horas candidatas: cada 30 minutos y que permitan completar la duración.
        Set<LocalTime> candidatas = new TreeSet<>();
        for (disponibilidadModel franja : franjas) {
            if (franja.getHora_inicio() == null || franja.getHora_fin() == null) {
                continue;
            }
            LocalTime hora = alinearMediaHora(franja.getHora_inicio());
            while (hora.isBefore(franja.getHora_fin())) {
                LocalTime fin = hora.plusMinutes(duracion);
                // Si el bloque no cabe en la franja o cruza medianoche, se detiene.
                if (!fin.isAfter(hora) || fin.isAfter(franja.getHora_fin())) {
                    break;
                }
                candidatas.add(hora);
                hora = hora.plusMinutes(30);
            }
        }

        // 4. Solo horas de inicio futuras (misma regla que @Future al crear).
        LocalDateTime ahora = LocalDateTime.now();
        if (fecha.equals(ahora.toLocalDate())) {
            candidatas.removeIf(hora -> !fecha.atTime(hora).isAfter(ahora));
        }

        // 5. Solicitudes que ya bloquean el horario (misma regla que HU-012).
        List<IntervaloOcupado> ocupados = new ArrayList<>();
        for (solicitud_reservaModel solicitud : solicitudReservaRepository.findByProveedor(proveedor)) {
            if (solicitud.getEstado() != estadoSolicitudModel.pendiente
                    && solicitud.getEstado() != estadoSolicitudModel.sugerida
                    && solicitud.getEstado() != estadoSolicitudModel.aceptada) {
                continue;
            }

            LocalDateTime inicio = solicitud.getFecha_hora_solicitada();
            if (solicitud.getEstado() == estadoSolicitudModel.sugerida
                    && solicitud.getFecha_hora_propuesta() != null) {
                inicio = solicitud.getFecha_hora_propuesta();
            }
            if (inicio == null || solicitud.getDuracion_snapshot_minutos() == null) {
                continue;
            }
            ocupados.add(new IntervaloOcupado(inicio, inicio.plusMinutes(solicitud.getDuracion_snapshot_minutos())));
        }

        DateTimeFormatter formato = DateTimeFormatter.ofPattern("HH:mm");
        List<String> disponibles = new ArrayList<>();
        List<String> bloqueadas = new ArrayList<>();

        for (LocalTime hora : candidatas) {
            LocalDateTime inicio = fecha.atTime(hora);
            LocalDateTime fin = inicio.plusMinutes(duracion);
            boolean ocupada = ocupados.stream().anyMatch(i -> i.solapa(inicio, fin));
            if (ocupada) {
                bloqueadas.add(hora.format(formato));
            } else {
                disponibles.add(hora.format(formato));
            }
        }

        String motivo = null;
        if (disponibles.isEmpty()) {
            motivo = candidatas.isEmpty() ? "SIN_HORARIOS_SUFICIENTES" : "SIN_HORARIOS_LIBRES";
        }

        return respuesta(proveedor, servicio, fecha, dia, true, motivo, disponibles, bloqueadas);
    }

    private disponibilidadPublicaDTO respuesta(proveedorModel proveedor, servicioModel servicio,
                                               LocalDate fecha, diaSemanaModel dia, boolean atiende,
                                               String motivo, List<String> disponibles,
                                               List<String> ocupadas) {
        return new disponibilidadPublicaDTO(
            proveedor.getId_proveedor(),
            servicio.getId_servicio(),
            servicio.getDuracion_minutos(),
            fecha,
            dia == null ? null : dia.name(),
            atiende,
            motivo,
            disponibles,
            ocupadas
        );
    }

    private diaSemanaModel traducirDiaSemana(DayOfWeek dia) {
        return switch (dia) {
            case MONDAY -> diaSemanaModel.lunes;
            case TUESDAY -> diaSemanaModel.martes;
            case WEDNESDAY -> diaSemanaModel.miercoles;
            case THURSDAY -> diaSemanaModel.jueves;
            case FRIDAY -> diaSemanaModel.viernes;
            case SATURDAY -> diaSemanaModel.sabado;
            case SUNDAY -> diaSemanaModel.domingo;
        };
    }

    /**
     * Primera hora en punto o a la media hora igual o posterior a la apertura.
     */
    private LocalTime alinearMediaHora(LocalTime apertura) {
        LocalTime base = apertura.withSecond(0).withNano(0);
        if (apertura.getSecond() > 0 || apertura.getNano() > 0) {
            base = base.plusMinutes(1);
        }
        int minuto = base.getMinute();
        if (minuto == 0 || minuto == 30) {
            return base;
        }
        if (minuto < 30) {
            return base.withMinute(30);
        }
        return base.plusHours(1).withMinute(0);
    }

    private record IntervaloOcupado(LocalDateTime inicio, LocalDateTime fin) {
        boolean solapa(LocalDateTime otroInicio, LocalDateTime otroFin) {
            return otroInicio.isBefore(fin) && otroFin.isAfter(inicio);
        }
    }
}