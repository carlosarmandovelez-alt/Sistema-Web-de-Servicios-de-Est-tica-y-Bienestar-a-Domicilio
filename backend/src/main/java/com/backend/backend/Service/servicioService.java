package com.backend.backend.Service;

import com.backend.backend.DTO.InsumoDTO;
import com.backend.backend.DTO.MultimediaDTO;
import com.backend.backend.DTO.actualizarServicioDTO;
import com.backend.backend.DTO.crearServicioDTO;
import com.backend.backend.DTO.insumoRequestDTO;
import com.backend.backend.DTO.multimediaRequestDTO;
import com.backend.backend.DTO.servicioResponseDTO;
import com.backend.backend.Exception.categoriaNoEncontradaException;
import com.backend.backend.Exception.insumoNoEncontradoException;
import com.backend.backend.Exception.multimediaNoEncontradaException;
import com.backend.backend.Exception.proveedorNoEncontradoException;
import com.backend.backend.Exception.servicioNoEncontradoException;
import com.backend.backend.Model.categoriaModel;
import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.servicioModel;
import com.backend.backend.Model.servicio_insumoModel;
import com.backend.backend.Model.servicio_multimediaModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Repository.categoriaRepository;
import com.backend.backend.Repository.proveedorRepository;
import com.backend.backend.Repository.servicioInsumoRepository;
import com.backend.backend.Repository.servicioMultimediaRepository;
import com.backend.backend.Repository.servicioRepository;
import com.backend.backend.Repository.usuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
public class servicioService {
    
    // Categorías oficiales permitidas para el PMV de Bienestar en Casa
    private static final Set<String> CATEGORIAS_PMV_VALIDAS = Set.of(
        "Estética facial",
        "Estética corporal",
        "Cuidado de la piel",
        "Manicura y pedicura",
        "Depilación",
        "Maquillaje",
        "Cuidado capilar",
        "Masajes relajantes",
        "Masajes no médicos",
        "Bienestar corporal",
        "Aromaterapia",
        "Relajación y bienestar"
    );
    
    @Autowired
    private servicioRepository servicioRepository;
    
    @Autowired
    private categoriaRepository categoriaRepository;
    
    @Autowired
    private usuarioRepository usuarioRepository;
    
    @Autowired
    private proveedorRepository proveedorRepository;
    
    @Autowired
    private servicioMultimediaRepository servicioMultimediaRepository;
    
    @Autowired
    private servicioInsumoRepository servicioInsumoRepository;
    
    @Transactional
    public servicioResponseDTO crearServicio(String email, crearServicioDTO dto) {
        // Buscar al proveedor autenticado
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        proveedorModel proveedor = proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new proveedorNoEncontradoException("Proveedor no encontrado"));
        
        // Validar que la categoría exista físicamente
        categoriaModel categoria = categoriaRepository.findById(dto.getId_categoria())
            .orElseThrow(() -> new categoriaNoEncontradaException("La categoría con ID " + dto.getId_categoria() + " no existe"));
        
        // Validar que la categoría pertenezca al dominio permitido del PMV
        if (!CATEGORIAS_PMV_VALIDAS.contains(categoria.getNombre().trim())) {
            throw new categoriaNoEncontradaException(
                "La categoría '" + categoria.getNombre() + "' no pertenece al dominio permitido para el PMV."
            );
        }
        
        // Crear el servicio
        servicioModel servicio = new servicioModel();
        servicio.setCategoria(categoria);
        servicio.setNombre(dto.getNombre().trim());
        servicio.setDescripcion(dto.getDescripcion().trim());
        servicio.setDuracion_minutos(dto.getDuracion_minutos());
        servicio.setPrecio(dto.getPrecio());
        
        // Estado: si el proveedor especifica un estado permitido, usarlo; de lo contrario por defecto 'activo'
        if (dto.getEstado() != null) {
            servicio.setEstado(dto.getEstado());
        } else {
            servicio.setEstado(estadoServicioModel.activo);
        }
        
        servicio.setFecha_creacion(LocalDateTime.now());
        servicio.setFecha_actualizacion(LocalDateTime.now());
        servicio.setProveedor(proveedor);
        
        servicioModel servicioGuardado = servicioRepository.save(servicio);
        
        return convertirADTO(servicioGuardado, categoria, proveedor);
    }
    
    @Transactional(readOnly = true)
    public List<servicioResponseDTO> listarServiciosProveedor(String email) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        
        return servicioRepository.findByProveedor(proveedor).stream()
            .map(s -> convertirADTO(s, s.getCategoria(), proveedor))
            .toList();
    }
    
    // HU-007 CA-01: Consulta de un servicio propio
    @Transactional(readOnly = true)
    public servicioResponseDTO consultarServicioPropio(String email, Integer idServicio) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        
        return convertirADTOConComplementaria(servicio, proveedor);
    }
    
    // HU-007 CA-02: Actualización de información de un servicio propio
    @Transactional
    public servicioResponseDTO actualizarServicio(String email, Integer idServicio, actualizarServicioDTO dto) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        
        // Validar categoría existente
        categoriaModel categoria = categoriaRepository.findById(dto.getId_categoria())
            .orElseThrow(() -> new categoriaNoEncontradaException("La categoría con ID " + dto.getId_categoria() + " no existe"));
        
        // Validar categoría en dominio PMV
        if (!CATEGORIAS_PMV_VALIDAS.contains(categoria.getNombre().trim())) {
            throw new categoriaNoEncontradaException(
                "La categoría '" + categoria.getNombre() + "' no pertenece al dominio permitido para el PMV."
            );
        }
        
        servicio.setCategoria(categoria);
        servicio.setNombre(dto.getNombre().trim());
        servicio.setDescripcion(dto.getDescripcion().trim());
        servicio.setDuracion_minutos(dto.getDuracion_minutos());
        servicio.setPrecio(dto.getPrecio());
        
        if (dto.getEstado() != null) {
            servicio.setEstado(dto.getEstado());
        }
        
        servicio.setFecha_actualizacion(LocalDateTime.now());
        
        servicioModel servicioGuardado = servicioRepository.save(servicio);
        return convertirADTOConComplementaria(servicioGuardado, proveedor);
    }
    
    // HU-007 CA-03 y CA-04: Cambio de estado (Activo / Inactivo) de un servicio propio
    @Transactional
    public servicioResponseDTO cambiarEstadoServicio(String email, Integer idServicio, estadoServicioModel nuevoEstado) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        
        servicio.setEstado(nuevoEstado);
        servicio.setFecha_actualizacion(LocalDateTime.now());
        
        servicioModel servicioGuardado = servicioRepository.save(servicio);
        return convertirADTOConComplementaria(servicioGuardado, proveedor);
    }
    
    // ============================================
    // HU-008: Gestión de información complementaria
    // ============================================
    
    // CA-01: Asociar una fotografía o video de referencia a un servicio propio
    @Transactional
    public MultimediaDTO agregarMultimedia(String email, Integer idServicio, multimediaRequestDTO dto) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        
        servicio_multimediaModel multimedia = new servicio_multimediaModel();
        multimedia.setServicio(servicio);
        multimedia.setTipo_archivo(dto.getTipo_archivo());
        multimedia.setUrl_archivo(dto.getUrl_archivo().trim());
        multimedia.setOrden(dto.getOrden() != null
            ? dto.getOrden()
            : siguienteOrdenMultimedia(servicio));
        
        return convertirMultimediaDTO(servicioMultimediaRepository.save(multimedia));
    }
    
    // CA-01 y CA-02: Consultar la multimedia asociada a un servicio propio
    @Transactional(readOnly = true)
    public List<MultimediaDTO> listarMultimedia(String email, Integer idServicio) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        
        return servicioMultimediaRepository.findByServicioOrdenado(servicio).stream()
            .map(this::convertirMultimediaDTO)
            .toList();
    }
    
    // CA-01 y CA-02: Actualizar una fotografía o video de un servicio propio
    @Transactional
    public MultimediaDTO actualizarMultimedia(String email, Integer idServicio, Integer idMultimedia,
                                              multimediaRequestDTO dto) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        servicio_multimediaModel multimedia = obtenerMultimediaDelServicio(idMultimedia, servicio);
        
        multimedia.setTipo_archivo(dto.getTipo_archivo());
        multimedia.setUrl_archivo(dto.getUrl_archivo().trim());
        if (dto.getOrden() != null) {
            multimedia.setOrden(dto.getOrden());
        }
        
        return convertirMultimediaDTO(servicioMultimediaRepository.save(multimedia));
    }
    
    // CA-01 y CA-02: Eliminar una fotografía o video de un servicio propio
    @Transactional
    public void eliminarMultimedia(String email, Integer idServicio, Integer idMultimedia) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        servicio_multimediaModel multimedia = obtenerMultimediaDelServicio(idMultimedia, servicio);
        
        servicioMultimediaRepository.delete(multimedia);
    }
    
    // CA-03: Registrar un producto, insumo o equipo utilizado en un servicio propio
    @Transactional
    public InsumoDTO agregarInsumo(String email, Integer idServicio, insumoRequestDTO dto) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        
        servicio_insumoModel insumo = new servicio_insumoModel();
        insumo.setServicio(servicio);
        insumo.setNombre(dto.getNombre().trim());
        insumo.setTipo(dto.getTipo());
        
        return convertirInsumoDTO(servicioInsumoRepository.save(insumo));
    }
    
    // CA-03: Consultar los productos, insumos o equipos de un servicio propio
    @Transactional(readOnly = true)
    public List<InsumoDTO> listarInsumos(String email, Integer idServicio) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        
        return servicioInsumoRepository.findByServicioOrdenado(servicio).stream()
            .map(this::convertirInsumoDTO)
            .toList();
    }
    
    // CA-03: Actualizar un producto, insumo o equipo de un servicio propio
    @Transactional
    public InsumoDTO actualizarInsumo(String email, Integer idServicio, Integer idInsumo, insumoRequestDTO dto) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        servicio_insumoModel insumo = obtenerInsumoDelServicio(idInsumo, servicio);
        
        insumo.setNombre(dto.getNombre().trim());
        insumo.setTipo(dto.getTipo());
        
        return convertirInsumoDTO(servicioInsumoRepository.save(insumo));
    }
    
    // CA-03: Eliminar un producto, insumo o equipo de un servicio propio
    @Transactional
    public void eliminarInsumo(String email, Integer idServicio, Integer idInsumo) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        servicio_insumoModel insumo = obtenerInsumoDelServicio(idInsumo, servicio);
        
        servicioInsumoRepository.delete(insumo);
    }
    
    private proveedorModel obtenerProveedorPorEmail(String email) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        return proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new proveedorNoEncontradoException("Proveedor no encontrado"));
    }
    
    private servicioModel obtenerServicioYValidarPropiedad(Integer idServicio, proveedorModel proveedor) {
        servicioModel servicio = servicioRepository.findById(idServicio)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio con ID " + idServicio + " no existe"));
        
        if (!servicio.getProveedor().getId_proveedor().equals(proveedor.getId_proveedor())) {
            throw new AccessDeniedException("No tienes permiso para gestionar este servicio porque no pertenece a tu catálogo.");
        }
        
        return servicio;
    }
    
    private servicio_multimediaModel obtenerMultimediaDelServicio(Integer idMultimedia, servicioModel servicio) {
        servicio_multimediaModel multimedia = servicioMultimediaRepository.findById(idMultimedia)
            .orElseThrow(() -> new multimediaNoEncontradaException(
                "La multimedia con ID " + idMultimedia + " no existe"));
        
        if (multimedia.getServicio() == null
                || !multimedia.getServicio().getId_servicio().equals(servicio.getId_servicio())) {
            throw new multimediaNoEncontradaException(
                "La multimedia con ID " + idMultimedia + " no pertenece al servicio indicado");
        }
        
        return multimedia;
    }
    
    private servicio_insumoModel obtenerInsumoDelServicio(Integer idInsumo, servicioModel servicio) {
        servicio_insumoModel insumo = servicioInsumoRepository.findById(idInsumo)
            .orElseThrow(() -> new insumoNoEncontradoException(
                "El producto, insumo o equipo con ID " + idInsumo + " no existe"));
        
        if (insumo.getServicio() == null
                || !insumo.getServicio().getId_servicio().equals(servicio.getId_servicio())) {
            throw new insumoNoEncontradoException(
                "El producto, insumo o equipo con ID " + idInsumo + " no pertenece al servicio indicado");
        }
        
        return insumo;
    }
    
    private Integer siguienteOrdenMultimedia(servicioModel servicio) {
        return servicioMultimediaRepository.findByServicioOrdenado(servicio).stream()
            .map(servicio_multimediaModel::getOrden)
            .filter(Objects::nonNull)
            .max(Integer::compareTo)
            // El esquema usa SMALLINT UNSIGNED: se evita desbordar el rango permitido
            .map(orden -> orden >= 65535 ? 65535 : orden + 1)
            .orElse(0);
    }
    
    private MultimediaDTO convertirMultimediaDTO(servicio_multimediaModel multimedia) {
        return new MultimediaDTO(
            multimedia.getId_multimedia(),
            multimedia.getTipo_archivo().name(),
            multimedia.getUrl_archivo(),
            multimedia.getOrden()
        );
    }
    
    private InsumoDTO convertirInsumoDTO(servicio_insumoModel insumo) {
        return new InsumoDTO(
            insumo.getId_insumo(),
            insumo.getNombre(),
            insumo.getTipo().name()
        );
    }
    
    private servicioResponseDTO convertirADTOConComplementaria(servicioModel servicio, proveedorModel proveedor) {
        List<MultimediaDTO> multimedia = servicioMultimediaRepository.findByServicioOrdenado(servicio).stream()
            .map(this::convertirMultimediaDTO)
            .toList();
        
        List<InsumoDTO> insumos = servicioInsumoRepository.findByServicioOrdenado(servicio).stream()
            .map(this::convertirInsumoDTO)
            .toList();
        
        return convertirADTO(servicio, servicio.getCategoria(), proveedor, multimedia, insumos);
    }
    
    private servicioResponseDTO convertirADTO(servicioModel servicio, categoriaModel categoria, proveedorModel proveedor) {
        return convertirADTO(servicio, categoria, proveedor, List.of(), List.of());
    }
    
    private servicioResponseDTO convertirADTO(servicioModel servicio, categoriaModel categoria,
                                              proveedorModel proveedor, List<MultimediaDTO> multimedia,
                                              List<InsumoDTO> insumos) {
        return new servicioResponseDTO(
            servicio.getId_servicio(),
            categoria.getId_categoria(),
            categoria.getNombre(),
            servicio.getNombre(),
            servicio.getDescripcion(),
            servicio.getDuracion_minutos(),
            servicio.getPrecio(),
            servicio.getEstado(),
            servicio.getFecha_creacion(),
            servicio.getFecha_actualizacion(),
            proveedor.getId_proveedor(),
            multimedia,
            insumos
        );
    }
}
