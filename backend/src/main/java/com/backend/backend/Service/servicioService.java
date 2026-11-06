package com.backend.backend.Service;

import com.backend.backend.DTO.*;
import com.backend.backend.Exception.categoriaNoEncontradaException;
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
    
    // ... (Métodos de HU-006 y HU-007 se mantienen igual) ...
    
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
    
    public servicioResponseDTO consultarServicio(String email, Integer idServicio) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        return convertirADTO(servicio, servicio.getCategoria(), proveedor);
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

    // ============================================
    // HU-008 (CON NOMBRES CORREGIDOS)
    // ============================================
    @Transactional
    public MultimediaDTO agregarMultimedia(String email, Integer idServicio, multimediaRequestDTO dto) { // <-- CAMBIO
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        
        servicio_multimediaModel multimedia = new servicio_multimediaModel();
        multimedia.setServicio(servicio);
        multimedia.setTipo_archivo(dto.getTipo_archivo());
        multimedia.setUrl_archivo(dto.getUrl_archivo());
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

    @Transactional
    public InsumoDTO agregarInsumo(String email, Integer idServicio, insumoRequestDTO dto) { // <-- CAMBIO
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
    
    // Métodos auxiliares
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