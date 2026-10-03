package com.backend.backend.Controller;

import com.backend.backend.DTO.proveedorListadoDTO;
import com.backend.backend.DTO.servicioListadoDTO;
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
    
    // CA-01: Consultar proveedores disponibles
    @GetMapping("/proveedores")
    public ResponseEntity<List<proveedorListadoDTO>> consultarProveedores() {
        List<proveedorListadoDTO> proveedores = exploracionService.consultarProveedores();
        return ResponseEntity.ok(proveedores);
    }
    
    // Listar todos los servicios activos
    @GetMapping("/servicios")
    public ResponseEntity<List<servicioListadoDTO>> listarServicios() {
        List<servicioListadoDTO> servicios = exploracionService.listarServicios();
        return ResponseEntity.ok(servicios);
    }
    
    // CA-02: Búsqueda por categoría
    @GetMapping("/servicios/categoria/{idCategoria}")
    public ResponseEntity<List<servicioListadoDTO>> buscarPorCategoria(@PathVariable Integer idCategoria) {
        List<servicioListadoDTO> servicios = exploracionService.buscarPorCategoria(idCategoria);
        return ResponseEntity.ok(servicios);
    }
    
    // CA-03: Búsqueda por nombre
    @GetMapping("/servicios/buscar")
    public ResponseEntity<List<servicioListadoDTO>> buscarPorNombre(@RequestParam String nombre) {
        List<servicioListadoDTO> servicios = exploracionService.buscarPorNombre(nombre);
        return ResponseEntity.ok(servicios);
    }
}