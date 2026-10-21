package com.backend.backend;

import com.backend.backend.Model.categoriaModel;
import com.backend.backend.Model.enums.estadoCuentaModel;
import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.enums.rolModel;
import com.backend.backend.Model.proveedorModel;
import com.backend.backend.Model.servicioModel;
import com.backend.backend.Model.usuarioModel;
import com.backend.backend.Model.zona_coberturaModel;
import com.backend.backend.Repository.categoriaRepository;
import com.backend.backend.Repository.proveedorRepository;
import com.backend.backend.Repository.servicioRepository;
import com.backend.backend.Repository.usuarioRepository;
import com.backend.backend.Repository.zonaCoberturaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas de aceptación de la HU-009: exploración de proveedores y búsqueda de servicios.
 *
 * Se ejecutan contra H2 en memoria (perfil "test") y verifican los endpoints
 * públicos reales que consume el frontend.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class HU009ExploracionTests {
    
    @Autowired
    private WebApplicationContext webApplicationContext;
    
    @Autowired
    private usuarioRepository usuarioRepository;
    
    @Autowired
    private proveedorRepository proveedorRepository;
    
    @Autowired
    private categoriaRepository categoriaRepository;
    
    @Autowired
    private servicioRepository servicioRepository;
    
    @Autowired
    private zonaCoberturaRepository zonaCoberturaRepository;
    
    private MockMvc mockMvc;
    
    private proveedorModel proveedorFacial;
    private proveedorModel proveedorMasajes;
    private categoriaModel categoriaFacial;
    private categoriaModel categoriaMasajes;
    private servicioModel servicioFacialActivo;
    private servicioModel servicioFacialInactivo;
    private servicioModel servicioMasajeActivo;
    
    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
            .webAppContextSetup(webApplicationContext)
            .apply(SecurityMockMvcConfigurers.springSecurity())
            .build();
        
        proveedorFacial = crearProveedor("laura@hu009.test", "Laura", "Gómez",
            "Especialista en estética facial.");
        proveedorMasajes = crearProveedor("andres@hu009.test", "Andrés", "Pérez",
            "Terapeuta de masajes relajantes.");
        // Proveedor sin servicios activos: no debe aparecer en la exploración.
        crearProveedor("inactivo@hu009.test", "Sofía", "Ramírez",
            "Proveedora sin servicios activos.");
        
        categoriaFacial = crearCategoria("Estética facial");
        categoriaMasajes = crearCategoria("Masajes relajantes");
        
        servicioFacialActivo = crearServicio(proveedorFacial, categoriaFacial,
            "Limpieza Facial Profunda", "activo");
        servicioFacialInactivo = crearServicio(proveedorFacial, categoriaFacial,
            "Servicio facial inactivo", "inactivo");
        servicioMasajeActivo = crearServicio(proveedorMasajes, categoriaMasajes,
            "Masaje relajante", "activo");
        
        zona_coberturaModel zona = new zona_coberturaModel();
        zona.setCiudad("Bogotá");
        zona.setBarrio_sector("Chapinero");
        zona.setProveedor(proveedorFacial);
        zonaCoberturaRepository.save(zona);
    }
    
    // ============================================================
    // CA-01: Consulta de proveedores disponibles
    // ============================================================
    
    @Test
    @DisplayName("CA-01: lista únicamente proveedores con al menos un servicio activo")
    void ca01ListaProveedoresConServiciosActivos() throws Exception {
        mockMvc.perform(get("/api/exploracion/proveedores"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[*].id", containsInAnyOrder(
                proveedorFacial.getId_proveedor(),
                proveedorMasajes.getId_proveedor())))
            .andExpect(jsonPath("$[*].nombre", containsInAnyOrder("Laura", "Andrés")))
            .andExpect(jsonPath("$[*].perfil_profesional",
                hasItem("Especialista en estética facial.")));
    }
    
    @Test
    @DisplayName("CA-01: excluye proveedores cuyos servicios están todos inactivos")
    void ca01ExcluyeProveedorSinServiciosActivos() throws Exception {
        // El proveedor sin servicios no aparece, aunque exista en la base de datos.
        mockMvc.perform(get("/api/exploracion/proveedores"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[*].nombre", not(hasItem("Sofía"))));
    }
    
    @Test
    @DisplayName("CA-01: el detalle del proveedor incluye zonas y solo servicios activos")
    void ca01DetalleProveedorIncluyeZonasYCatalogoActivo() throws Exception {
        mockMvc.perform(get("/api/exploracion/proveedores/{id}",
                proveedorFacial.getId_proveedor()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(proveedorFacial.getId_proveedor()))
            .andExpect(jsonPath("$.nombre").value("Laura"))
            .andExpect(jsonPath("$.apellido").value("Gómez"))
            .andExpect(jsonPath("$.zonasAtencion", hasSize(1)))
            .andExpect(jsonPath("$.zonasAtencion[0].ciudad").value("Bogotá"))
            .andExpect(jsonPath("$.zonasAtencion[0].barrio_sector").value("Chapinero"))
            .andExpect(jsonPath("$.catalogo", hasSize(1)))
            .andExpect(jsonPath("$.catalogo[0].id").value(servicioFacialActivo.getId_servicio()))
            .andExpect(jsonPath("$.catalogo[*].nombre",
                not(hasItem(servicioFacialInactivo.getNombre()))));
    }
    
    // ============================================================
    // CA-02: Búsqueda de servicios por categoría
    // ============================================================
    
    @Test
    @DisplayName("CA-02: filtra por el ID real de la categoría y solo devuelve servicios activos")
    void ca02FiltraPorCategoria() throws Exception {
        mockMvc.perform(get("/api/exploracion/servicios/categoria/{idCategoria}",
                categoriaFacial.getId_categoria()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].id").value(servicioFacialActivo.getId_servicio()))
            .andExpect(jsonPath("$[0].categoria").value("Estética facial"))
            .andExpect(jsonPath("$[*].nombre",
                not(hasItem(servicioFacialInactivo.getNombre()))));
    }
    
    @Test
    @DisplayName("CA-02: una categoría sin servicios activos devuelve una lista vacía")
    void ca02CategoriaSinServiciosDevuelveListaVacia() throws Exception {
        categoriaModel categoriaVacia = crearCategoria("Cuidado capilar");
        
        mockMvc.perform(get("/api/exploracion/servicios/categoria/{idCategoria}",
                categoriaVacia.getId_categoria()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }
    
    @Test
    @DisplayName("CA-02: el listado general contiene todos los servicios activos")
    void ca02ListadoGeneralSoloServiciosActivos() throws Exception {
        mockMvc.perform(get("/api/exploracion/servicios"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[*].id", containsInAnyOrder(
                servicioFacialActivo.getId_servicio(),
                servicioMasajeActivo.getId_servicio())))
            .andExpect(jsonPath("$[*].nombre",
                not(hasItem(servicioFacialInactivo.getNombre()))));
    }
    
    // ============================================================
    // CA-03: Búsqueda de servicios por nombre
    // ============================================================
    
    @Test
    @DisplayName("CA-03: busca por nombre parcial sin distinguir mayúsculas de minúsculas")
    void ca03BuscaPorNombreParcial() throws Exception {
        mockMvc.perform(get("/api/exploracion/servicios/buscar").param("nombre", "facial"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].id").value(servicioFacialActivo.getId_servicio()))
            .andExpect(jsonPath("$[0].nombre").value("Limpieza Facial Profunda"));
        
        mockMvc.perform(get("/api/exploracion/servicios/buscar").param("nombre", "LIMPIEZA"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].id").value(servicioFacialActivo.getId_servicio()));
    }
    
    @Test
    @DisplayName("CA-03: la búsqueda por nombre excluye servicios inactivos")
    void ca03BusquedaExcluyeServiciosInactivos() throws Exception {
        mockMvc.perform(get("/api/exploracion/servicios/buscar").param("nombre", "inactivo"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }
    
    // ============================================================
    // CA-04: Búsqueda sin coincidencias
    // ============================================================
    
    @Test
    @DisplayName("CA-04: una búsqueda sin coincidencias devuelve una lista vacía, no un error")
    void ca04BusquedaSinCoincidenciasDevuelveListaVacia() throws Exception {
        mockMvc.perform(get("/api/exploracion/servicios/buscar")
                .param("nombre", "servicio-que-no-existe"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }
    
    @Test
    @DisplayName("CA-04: una categoría inexistente devuelve una lista vacía, no un error")
    void ca04CategoriaInexistenteDevuelveListaVacia() throws Exception {
        mockMvc.perform(get("/api/exploracion/servicios/categoria/{idCategoria}", 999999))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }
    
    // ============================================================
    // Acceso público
    // ============================================================
    
    @Test
    @DisplayName("Los endpoints de exploración son públicos y no exigen autenticación")
    void exploracionEsPublica() throws Exception {
        mockMvc.perform(get("/api/exploracion/proveedores"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/exploracion/servicios"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/categorias"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].nombre").value("Estética facial"))
            .andExpect(jsonPath("$[1].nombre").value("Masajes relajantes"));
    }
    
    // ============================================================
    // Utilidades de siembra de datos
    // ============================================================
    
    private proveedorModel crearProveedor(String email, String nombre, String apellido,
                                          String perfilProfesional) {
        usuarioModel usuario = new usuarioModel();
        usuario.setEmail(email);
        usuario.setPassword_hash("hash-de-prueba");
        usuario.setRol(rolModel.proveedor);
        usuario.setNombre(nombre);
        usuario.setApellido(apellido);
        usuario.setTelefono("3000000000");
        usuario.setEstado_cuenta(estadoCuentaModel.activo);
        usuario.setFecha_registro(LocalDateTime.now());
        usuario.setFecha_actualizacion(LocalDateTime.now());
        usuario = usuarioRepository.save(usuario);
        
        proveedorModel proveedor = new proveedorModel();
        proveedor.setUsuario(usuario);
        proveedor.setPerfil_profesional(perfilProfesional);
        return proveedorRepository.save(proveedor);
    }
    
    private categoriaModel crearCategoria(String nombre) {
        categoriaModel categoria = new categoriaModel();
        categoria.setNombre(nombre);
        return categoriaRepository.save(categoria);
    }
    
    private servicioModel crearServicio(proveedorModel proveedor, categoriaModel categoria,
                                        String nombre, String estado) {
        servicioModel servicio = new servicioModel();
        servicio.setCategoria(categoria);
        servicio.setNombre(nombre);
        servicio.setDescripcion("Descripción de " + nombre);
        servicio.setDuracion_minutos(60);
        servicio.setPrecio(new BigDecimal("85000.00"));
        servicio.setEstado(estadoServicioModel.valueOf(estado));
        servicio.setFecha_creacion(LocalDateTime.now());
        servicio.setFecha_actualizacion(LocalDateTime.now());
        servicio.setProveedor(proveedor);
        return servicioRepository.save(servicio);
    }
}
