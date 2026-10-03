package com.backend.backend.Service;

import com.backend.backend.DTO.proveedorListadoDTO;
import com.backend.backend.DTO.servicioListadoDTO;
import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.servicioModel;
import com.backend.backend.Repository.proveedorRepository;
import com.backend.backend.Repository.servicioRepository;
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
    
    // Listar todos los servicios activos
    public List<servicioListadoDTO> listarServicios() {
        List<servicioModel> servicios = servicioRepository.findByEstado(estadoServicioModel.activo);
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
}