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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
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
        
        return convertirADTO(servicio, servicio.getCategoria(), proveedor);
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
        return convertirADTO(servicioGuardado, categoria, proveedor);
    }
    
    // HU-007 CA-03 y CA-04: Cambio de estado (Activo / Inactivo) de un servicio propio
    @Transactional
    public servicioResponseDTO cambiarEstadoServicio(String email, Integer idServicio, estadoServicioModel nuevoEstado) {
        proveedorModel proveedor = obtenerProveedorPorEmail(email);
        servicioModel servicio = obtenerServicioYValidarPropiedad(idServicio, proveedor);
        
        servicio.setEstado(nuevoEstado);
        servicio.setFecha_actualizacion(LocalDateTime.now());
        
        servicioModel servicioGuardado = servicioRepository.save(servicio);
        return convertirADTO(servicioGuardado, servicioGuardado.getCategoria(), proveedor);
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
