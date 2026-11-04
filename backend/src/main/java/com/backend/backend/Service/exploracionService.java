package com.backend.backend.Service;

import com.backend.backend.DTO.*;
import com.backend.backend.Exception.proveedorNoEncontradoException;
import com.backend.backend.Exception.servicioNoEncontradoException;
import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.servicio_insumoModel;
import com.backend.backend.Model.servicioModel;
import com.backend.backend.Model.servicio_multimediaModel;
import com.backend.backend.Model.zona_coberturaModel;
import com.backend.backend.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
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
    
    // ============================================
    // HU-009: Exploración de proveedores y servicios
    // ============================================
    
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
    
    // ============================================
    // HU-010: Consulta del perfil del proveedor y detalle del servicio
    // ============================================
    
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
}