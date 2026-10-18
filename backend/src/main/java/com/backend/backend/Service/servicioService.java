package com.backend.backend.Service;

import com.backend.backend.DTO.actualizarServicioDTO;
import com.backend.backend.DTO.crearServicioDTO;
import com.backend.backend.DTO.servicioResponseDTO;
import com.backend.backend.Exception.categoriaNoEncontradaException;
import com.backend.backend.Exception.proveedorNoEncontradoException;
import com.backend.backend.Exception.servicioNoEncontradoException;
import com.backend.backend.Model.categoriaModel;
import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.servicioModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Repository.categoriaRepository;
import com.backend.backend.Repository.proveedorRepository;
import com.backend.backend.Repository.servicioRepository;
import com.backend.backend.Repository.usuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

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
    
    // ============================================
    // HU-006: Crear servicio
    // ============================================
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
        
        servicioModel servicioGuardado = servicioRepository.save(servicio);
        
        return convertirADTO(servicioGuardado, categoria, proveedor);
    }
    
    // ============================================
    // HU-007: Consultar un servicio propio
    // ============================================
    public servicioResponseDTO consultarServicio(String email, Integer idServicio) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        
        // Usamos el nuevo método con @Query
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        
        return convertirADTO(servicio, servicio.getCategoria(), proveedor);
    }
    
    // ============================================
    // HU-007: Actualizar un servicio
    // ============================================
    @Transactional
    public servicioResponseDTO actualizarServicio(String email, Integer idServicio, actualizarServicioDTO dto) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        
        // Usamos el nuevo método con @Query
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        
        categoriaModel categoria = obtenerCategoria(dto.getId_categoria());
        
        servicio.setCategoria(categoria);
        servicio.setNombre(dto.getNombre().trim());
        servicio.setDescripcion(dto.getDescripcion());
        servicio.setDuracion_minutos(dto.getDuracion_minutos());
        servicio.setPrecio(dto.getPrecio());
        servicio.setFecha_actualizacion(LocalDateTime.now());
        
        servicioModel servicioActualizado = servicioRepository.save(servicio);
        
        return convertirADTO(servicioActualizado, categoria, proveedor);
    }
    
    // ============================================
    // HU-007: Cambiar estado del servicio
    // ============================================
    @Transactional
    public servicioResponseDTO cambiarEstadoServicio(String email, Integer idServicio, String nuevoEstado) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        
        // Usamos el nuevo método con @Query
        servicioModel servicio = servicioRepository.buscarPorIdYProveedor(idServicio, proveedor)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe o no pertenece a su catálogo"));
        
        estadoServicioModel estado;
        try {
            // Usamos trim() por si envían espacios y toLowerCase() para evitar problemas de mayúsculas
            estado = estadoServicioModel.valueOf(nuevoEstado.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Estado no válido. Debe ser 'activo' o 'inactivo'");
        }
        
        servicio.setEstado(estado);
        servicio.setFecha_actualizacion(LocalDateTime.now());
        
        servicioModel servicioActualizado = servicioRepository.save(servicio);
        
        return convertirADTO(servicioActualizado, servicio.getCategoria(), proveedor);
    }
    
    // ============================================
    // Métodos auxiliares
    // ============================================
    private proveedorModel obtenerProveedorPorEmail(String email) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        
        return proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new proveedorNoEncontradoException("Proveedor no encontrado"));
    }
    
    private categoriaModel obtenerCategoria(Integer idCategoria) {
        return categoriaRepository.findById(idCategoria)
            .orElseThrow(() -> new categoriaNoEncontradaException("La categoría con ID " + idCategoria + " no existe"));
    }
    
    private servicioResponseDTO convertirADTO(servicioModel servicio, categoriaModel categoria, proveedorModel proveedor) {
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
            proveedor.getId_proveedor()
        );
    }
}