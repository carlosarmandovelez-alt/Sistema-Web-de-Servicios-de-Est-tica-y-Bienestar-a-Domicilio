package com.backend.backend.Service;

import com.backend.backend.DTO.*;
import com.backend.backend.Exception.accesoDenegadoException;
import com.backend.backend.Exception.categoriaNoEncontradaException;
import com.backend.backend.Exception.datosInvalidosException;
import com.backend.backend.Exception.proveedorNoEncontradoException;
import com.backend.backend.Exception.servicioNoEncontradoException;
import com.backend.backend.Model.categoriaModel;
import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.enums.tipoArchivoModel;
import com.backend.backend.Model.enums.tipoInsumoModel;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
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

    // ============================================
    // HU-006 / HU-007: Gestión del catálogo
    // ============================================
    @Transactional
    public servicioResponseDTO crearServicio(String email, crearServicioDTO dto) {
        proveedorModel proveedor = obtenerProveedor(email);

        categoriaModel categoria = categoriaRepository.findById(dto.getId_categoria())
            .orElseThrow(() -> new categoriaNoEncontradaException(
                "La categoría con ID " + dto.getId_categoria() + " no existe"));

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

        return convertirADTO(servicioRepository.save(servicio));
    }

    public List<servicioResponseDTO> listarMisServicios(String email) {
        proveedorModel proveedor = obtenerProveedor(email);
        return servicioRepository.findByProveedor(proveedor).stream()
            .sorted(Comparator.comparing(servicioModel::getId_servicio).reversed())
            .map(this::convertirADTO)
            .collect(Collectors.toList());
    }

    public servicioResponseDTO consultarMiServicio(String email, Integer idServicio) {
        proveedorModel proveedor = obtenerProveedor(email);
        return convertirADTO(obtenerServicioDelProveedor(idServicio, proveedor));
    }

    @Transactional
    public servicioResponseDTO actualizarServicio(String email, Integer idServicio, actualizarServicioDTO dto) {
        proveedorModel proveedor = obtenerProveedor(email);
        servicioModel servicio = obtenerServicioDelProveedor(idServicio, proveedor);

        categoriaModel categoria = categoriaRepository.findById(dto.getId_categoria())
            .orElseThrow(() -> new categoriaNoEncontradaException(
                "La categoría con ID " + dto.getId_categoria() + " no existe"));

        servicio.setCategoria(categoria);
        servicio.setNombre(dto.getNombre().trim());
        servicio.setDescripcion(dto.getDescripcion());
        servicio.setDuracion_minutos(dto.getDuracion_minutos());
        servicio.setPrecio(dto.getPrecio());
        servicio.setFecha_actualizacion(LocalDateTime.now());

        return convertirADTO(servicioRepository.save(servicio));
    }

    @Transactional
    public servicioResponseDTO cambiarEstadoServicio(String email, Integer idServicio, cambiarEstadoServicioDTO dto) {
        proveedorModel proveedor = obtenerProveedor(email);
        servicioModel servicio = obtenerServicioDelProveedor(idServicio, proveedor);

        if (dto.getEstado() == null) {
            throw new datosInvalidosException("El estado es obligatorio");
        }

        servicio.setEstado(dto.getEstado());
        servicio.setFecha_actualizacion(LocalDateTime.now());

        return convertirADTO(servicioRepository.save(servicio));
    }

    // ============================================
    // HU-008: Multimedia e insumos del servicio
    // ============================================
    public List<MultimediaDTO> listarMultimedia(String email, Integer idServicio) {
        servicioModel servicio = obtenerServicioDelProveedor(idServicio, obtenerProveedor(email));
        return servicioMultimediaRepository.findByServicio(servicio).stream()
            .sorted(Comparator.comparing(servicio_multimediaModel::getOrden))
            .map(m -> new MultimediaDTO(
                m.getId_multimedia(),
                m.getTipo_archivo().name(),
                m.getUrl_archivo(),
                m.getOrden()))
            .collect(Collectors.toList());
    }

    @Transactional
    public MultimediaDTO agregarMultimedia(String email, Integer idServicio, MultimediaDTO dto) {
        servicioModel servicio = obtenerServicioDelProveedor(idServicio, obtenerProveedor(email));

        if (dto.getUrl_archivo() == null || dto.getUrl_archivo().isBlank()) {
            throw new datosInvalidosException("La URL del archivo es obligatoria");
        }

        tipoArchivoModel tipo;
        try {
            tipo = tipoArchivoModel.valueOf(
                dto.getTipo_archivo() == null ? "" : dto.getTipo_archivo().trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new datosInvalidosException("El tipo de archivo debe ser 'foto' o 'video'");
        }

        servicio_multimediaModel multimedia = new servicio_multimediaModel();
        multimedia.setServicio(servicio);
        multimedia.setTipo_archivo(tipo);
        multimedia.setUrl_archivo(dto.getUrl_archivo().trim());
        multimedia.setOrden(dto.getOrden() == null ? 0 : dto.getOrden());

        servicio_multimediaModel guardado = servicioMultimediaRepository.save(multimedia);

        return new MultimediaDTO(
            guardado.getId_multimedia(),
            guardado.getTipo_archivo().name(),
            guardado.getUrl_archivo(),
            guardado.getOrden());
    }

    @Transactional
    public void eliminarMultimedia(String email, Integer idServicio, Integer idMultimedia) {
        servicioModel servicio = obtenerServicioDelProveedor(idServicio, obtenerProveedor(email));
        servicio_multimediaModel multimedia = servicioMultimediaRepository.findById(idMultimedia)
            .orElseThrow(() -> new datosInvalidosException("El archivo multimedia no existe"));

        if (!multimedia.getServicio().getId_servicio().equals(servicio.getId_servicio())) {
            throw new accesoDenegadoException("El archivo multimedia no pertenece a este servicio");
        }

        servicioMultimediaRepository.delete(multimedia);
    }

    public List<InsumoDTO> listarInsumos(String email, Integer idServicio) {
        servicioModel servicio = obtenerServicioDelProveedor(idServicio, obtenerProveedor(email));
        return servicioInsumoRepository.findByServicio(servicio).stream()
            .map(i -> new InsumoDTO(
                i.getId_insumo(),
                i.getNombre(),
                i.getTipo().name()))
            .collect(Collectors.toList());
    }

    @Transactional
    public InsumoDTO agregarInsumo(String email, Integer idServicio, InsumoDTO dto) {
        servicioModel servicio = obtenerServicioDelProveedor(idServicio, obtenerProveedor(email));

        if (dto.getNombre() == null || dto.getNombre().isBlank()) {
            throw new datosInvalidosException("El nombre del insumo o equipo es obligatorio");
        }

        tipoInsumoModel tipo;
        try {
            tipo = tipoInsumoModel.valueOf(
                dto.getTipo() == null ? "insumo" : dto.getTipo().trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new datosInvalidosException("El tipo debe ser 'insumo' o 'equipo'");
        }

        servicio_insumoModel insumo = new servicio_insumoModel();
        insumo.setServicio(servicio);
        insumo.setNombre(dto.getNombre().trim());
        insumo.setTipo(tipo);

        servicio_insumoModel guardado = servicioInsumoRepository.save(insumo);

        return new InsumoDTO(
            guardado.getId_insumo(),
            guardado.getNombre(),
            guardado.getTipo().name());
    }

    @Transactional
    public void eliminarInsumo(String email, Integer idServicio, Integer idInsumo) {
        servicioModel servicio = obtenerServicioDelProveedor(idServicio, obtenerProveedor(email));
        servicio_insumoModel insumo = servicioInsumoRepository.findById(idInsumo)
            .orElseThrow(() -> new datosInvalidosException("El insumo o equipo no existe"));

        if (!insumo.getServicio().getId_servicio().equals(servicio.getId_servicio())) {
            throw new accesoDenegadoException("El insumo o equipo no pertenece a este servicio");
        }

        servicioInsumoRepository.delete(insumo);
    }

    // ============================================
    // Auxiliares
    // ============================================
    private proveedorModel obtenerProveedor(String email) {
        usuarioModel usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new accesoDenegadoException("Usuario no encontrado"));

        if (!usuario.getRol().name().equals("proveedor")) {
            throw new accesoDenegadoException("Esta operación es exclusiva de proveedores");
        }

        return proveedorRepository.findByUsuario(usuario)
            .orElseThrow(() -> new proveedorNoEncontradoException("Proveedor no encontrado"));
    }

    private servicioModel obtenerServicioDelProveedor(Integer idServicio, proveedorModel proveedor) {
        servicioModel servicio = servicioRepository.findById(idServicio)
            .orElseThrow(() -> new servicioNoEncontradoException("El servicio no existe"));

        if (!servicio.getProveedor().getId_proveedor().equals(proveedor.getId_proveedor())) {
            throw new accesoDenegadoException("El servicio no pertenece a su catálogo");
        }

        return servicio;
    }

    private servicioResponseDTO convertirADTO(servicioModel servicio) {
        categoriaModel categoria = servicio.getCategoria();
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
            servicio.getProveedor().getId_proveedor()
        );
    }
}
