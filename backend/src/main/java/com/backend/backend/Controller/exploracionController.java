package com.backend.backend.Controller;

import com.backend.backend.DTO.*;
import com.backend.backend.Service.exploracionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exploracion")
@CrossOrigin(origins = "*")
public class exploracionController {
    
    @Autowired
    private exploracionService exploracionService;
    
    // HU-009: Consultar proveedores disponibles
    @GetMapping("/proveedores")
    public ResponseEntity<List<proveedorListadoDTO>> consultarProveedores() {
        return ResponseEntity.ok(exploracionService.consultarProveedores());
    }
    
    // HU-009: Listar servicios activos
    @GetMapping("/servicios")
    public ResponseEntity<List<servicioListadoDTO>> listarServicios() {
        return ResponseEntity.ok(exploracionService.listarServicios());
    }
    
    // HU-009: Búsqueda por categoría
    @GetMapping("/servicios/categoria/{idCategoria}")
    public ResponseEntity<List<servicioListadoDTO>> buscarPorCategoria(@PathVariable Integer idCategoria) {
        return ResponseEntity.ok(exploracionService.buscarPorCategoria(idCategoria));
    }
    
    // HU-009: Búsqueda por nombre
    @GetMapping("/servicios/buscar")
    public ResponseEntity<List<servicioListadoDTO>> buscarPorNombre(@RequestParam String nombre) {
        return ResponseEntity.ok(exploracionService.buscarPorNombre(nombre));
    }
    
    // HU-010: Consultar perfil del proveedor
    @GetMapping("/proveedores/{idProveedor}")
    public ResponseEntity<proveedorDetalleDTO> consultarPerfilProveedor(@PathVariable Integer idProveedor) {
        return ResponseEntity.ok(exploracionService.consultarPerfilProveedor(idProveedor));
    }
    
    // HU-010: Consultar detalle de un servicio
    @GetMapping("/servicios/{idServicio}")
    public ResponseEntity<servicioDetalleDTO> consultarDetalleServicio(@PathVariable Integer idServicio) {
        return ResponseEntity.ok(exploracionService.consultarDetalleServicio(idServicio));
    }
}