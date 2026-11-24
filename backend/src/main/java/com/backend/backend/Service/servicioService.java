package com.backend.backend.Service;

import com.backend.backend.DTO.*;
import com.backend.backend.Exception.categoriaNoEncontradaException;
import com.backend.backend.Exception.formatoInvalidoException;
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
import com.backend.backend.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class servicioService {
    
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
    
    // HU-006 Crear servicio 
    @Transactional
    public servicioResponseDTO crearServicio(String email, crearServicioDTO dto) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        categoriaModel categoria = obtenerCategoria(dto.getId_categoria());
        servicioModel servicio = new servicioModel();
        servicio.setCategoria(categoria);
        servicio.setNombre(dto.getNombre().trim());
        servicio.setDescripcion(dto.getDescripcion());
        servicio.setDuracion_minutos(dto.getDuracion_minutos());
        servicio.setPrecio(dto.getPrecio());
        servicio.setEstado(estadoServicioModel.activo);
        servicio.setFecha_creacion(LocalDateTime.now());
        servicio.setFecha_actualizacion(LocalDateTime.now());
        servicio.setProveedor(proveedor);
        return convertirADTO(servicioRepository.save(servicio), categoria, proveedor);
    }
    
    // HU-007 
    public servicioResponseDTO consultarServicio(String email, Integer idServicio) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        return convertirADTO(servicio, servicio.getCategoria(), proveedor);
    }
    
    // HU-007: catálogo completo del Proveedor autenticado
    public List<servicioResponseDTO> listarServiciosProveedor(String email) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        return servicioRepository.findByProveedor(proveedor).stream()
            .map(servicio -> convertirADTO(servicio, servicio.getCategoria(), proveedor))
            .collect(Collectors.toList());
    }

    @Transactional
    public servicioResponseDTO actualizarServicio(String email, Integer idServicio, actualizarServicioDTO dto) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        categoriaModel categoria = obtenerCategoria(dto.getId_categoria());
        servicio.setCategoria(categoria);
        servicio.setNombre(dto.getNombre().trim());
        servicio.setDescripcion(dto.getDescripcion());
        servicio.setDuracion_minutos(dto.getDuracion_minutos());
        servicio.setPrecio(dto.getPrecio());
        servicio.setFecha_actualizacion(LocalDateTime.now());
        return convertirADTO(servicioRepository.save(servicio), categoria, proveedor);
    }
    
    @Transactional
    public servicioResponseDTO cambiarEstadoServicio(String email, Integer idServicio, String nuevoEstado) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        estadoServicioModel estado;
        try {
            estado = estadoServicioModel.valueOf(nuevoEstado.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Estado no válido. Debe ser 'activo' o 'inactivo'");
        }
        servicio.setEstado(estado);
        servicio.setFecha_actualizacion(LocalDateTime.now());
        return convertirADTO(servicioRepository.save(servicio), servicio.getCategoria(), proveedor);
    }

  
    // HU-008 
    @Transactional
    public MultimediaDTO agregarMultimedia(String email, Integer idServicio, multimediaRequestDTO dto) { 
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        
        // Validación estricta de URL según tipo (foto/video)
        String url = validarUrlMultimedia(dto.getUrl_archivo(), dto.getTipo_archivo().name());

        servicio_multimediaModel multimedia = new servicio_multimediaModel();
        multimedia.setServicio(servicio);
        multimedia.setTipo_archivo(dto.getTipo_archivo());
        multimedia.setUrl_archivo(url);
        multimedia.setOrden(dto.getOrden() != null ? dto.getOrden() : 0);
        
        servicio_multimediaModel guardado = servicioMultimediaRepository.save(multimedia);
        return new MultimediaDTO(guardado.getId_multimedia(), guardado.getTipo_archivo().name(), guardado.getUrl_archivo(), guardado.getOrden());
    }

    public List<MultimediaDTO> consultarMultimedia(String email, Integer idServicio) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        return servicioMultimediaRepository.findByServicio(servicio).stream()
            .map(m -> new MultimediaDTO(m.getId_multimedia(), m.getTipo_archivo().name(), m.getUrl_archivo(), m.getOrden()))
            .collect(Collectors.toList());
    }

    // HU-008: actualizar una fotografía o video del servicio
    @Transactional
    public MultimediaDTO actualizarMultimedia(String email, Integer idServicio, Integer idMultimedia,
                                              multimediaRequestDTO dto) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        servicio_multimediaModel multimedia = obtenerMultimediaDelServicio(idMultimedia, servicio);

        multimedia.setTipo_archivo(dto.getTipo_archivo());
        multimedia.setUrl_archivo(validarUrlMultimedia(dto.getUrl_archivo(), dto.getTipo_archivo().name()));
        if (dto.getOrden() != null) {
            multimedia.setOrden(dto.getOrden());
        }

        servicio_multimediaModel guardado = servicioMultimediaRepository.save(multimedia);
        return new MultimediaDTO(guardado.getId_multimedia(), guardado.getTipo_archivo().name(),
            guardado.getUrl_archivo(), guardado.getOrden());
    }

    // HU-008: eliminar una fotografía o video del servicio
    @Transactional
    public void eliminarMultimedia(String email, Integer idServicio, Integer idMultimedia) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        servicio_multimediaModel multimedia = obtenerMultimediaDelServicio(idMultimedia, servicio);
        servicioMultimediaRepository.delete(multimedia);
    }

    @Transactional
    public InsumoDTO agregarInsumo(String email, Integer idServicio, insumoRequestDTO dto) { 
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        
        servicio_insumoModel insumo = new servicio_insumoModel();
        insumo.setServicio(servicio);
        insumo.setNombre(dto.getNombre().trim());
        insumo.setTipo(dto.getTipo());
        
        servicio_insumoModel guardado = servicioInsumoRepository.save(insumo);
        return new InsumoDTO(guardado.getId_insumo(), guardado.getNombre(), guardado.getTipo().name());
    }

    public List<InsumoDTO> consultarInsumos(String email, Integer idServicio) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        return servicioInsumoRepository.findByServicio(servicio).stream()
            .map(i -> new InsumoDTO(i.getId_insumo(), i.getNombre(), i.getTipo().name()))
            .collect(Collectors.toList());
    }

    // HU-008: actualizar un producto, insumo o equipo del servicio
    @Transactional
    public InsumoDTO actualizarInsumo(String email, Integer idServicio, Integer idInsumo, insumoRequestDTO dto) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        servicio_insumoModel insumo = obtenerInsumoDelServicio(idInsumo, servicio);

        insumo.setNombre(dto.getNombre().trim());
        insumo.setTipo(dto.getTipo());

        servicio_insumoModel guardado = servicioInsumoRepository.save(insumo);
        return new InsumoDTO(guardado.getId_insumo(), guardado.getNombre(), guardado.getTipo().name());
    }

    // HU-008: eliminar un producto, insumo o equipo del servicio
    @Transactional
    public void eliminarInsumo(String email, Integer idServicio, Integer idInsumo) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        servicio_insumoModel insumo = obtenerInsumoDelServicio(idInsumo, servicio);
        servicioInsumoRepository.delete(insumo);
    }
    
    // Métodos auxiliares

    /**
     * HU-008: Valida que la URL sea válida y que coincida con el tipo de archivo.
     */
    private String validarUrlMultimedia(String url, String tipoArchivo) {
        if (url == null || url.trim().isEmpty()) {
            throw new formatoInvalidoException("La URL del archivo no puede estar vacía.");
        }
        
        String limpia = url.trim();
        
        // 1. Validar que sea una URL http/https básica
        if (!limpia.matches("(?i)^https?://\\S+$")) {
            throw new formatoInvalidoException("La URL debe iniciar con http:// o https:// y no contener espacios.");
        }

        // 2. Validar que el tipo de archivo coincida con la URL
        String urlSinParams = limpia.toLowerCase().split("\\?")[0];
        
        boolean esImagen = urlSinParams.endsWith(".jpg") || urlSinParams.endsWith(".jpeg") || 
                           urlSinParams.endsWith(".png") || urlSinParams.endsWith(".gif") || 
                           urlSinParams.endsWith(".webp");
                           
        boolean esVideo = urlSinParams.endsWith(".mp4") || urlSinParams.endsWith(".mov") || 
                          urlSinParams.endsWith(".avi") || urlSinParams.endsWith(".mkv");

        if (tipoArchivo != null && tipoArchivo.equalsIgnoreCase("foto")) {
            if (!esImagen) {
                throw new formatoInvalidoException("Si el tipo de archivo es 'foto', la URL debe terminar en un formato de imagen válido (jpg, png, etc).");
            }
        } else if (tipoArchivo != null && tipoArchivo.equalsIgnoreCase("video")) {
            if (!esVideo) {
                throw new formatoInvalidoException("Si el tipo de archivo es 'video', la URL debe terminar en un formato de video válido (mp4, mov, etc).");
            }
        } else {
            throw new formatoInvalidoException("El tipo de archivo debe ser 'foto' o 'video'.");
        }

        return limpia;
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

    private proveedorModel obtenerProveedorPorEmail(String email) {
        usuarioModel usuario = usuarioRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        return proveedorRepository.findByUsuario(usuario).orElseThrow(() -> new proveedorNoEncontradoException("Proveedor no encontrado"));
    }
    
    private categoriaModel obtenerCategoria(Integer idCategoria) {
        return categoriaRepository.findById(idCategoria).orElseThrow(() -> new categoriaNoEncontradaException("La categoría con ID " + idCategoria + " no existe"));
    }
    
    private servicioResponseDTO convertirADTO(servicioModel servicio, categoriaModel categoria, proveedorModel proveedor) {
        return new servicioResponseDTO(servicio.getId_servicio(), categoria.getId_categoria(), categoria.getNombre(), servicio.getNombre(), servicio.getDescripcion(), servicio.getDuracion_minutos(), servicio.getPrecio(), servicio.getEstado(), servicio.getFecha_creacion(), servicio.getFecha_actualizacion(), proveedor.getId_proveedor());
    }
}
