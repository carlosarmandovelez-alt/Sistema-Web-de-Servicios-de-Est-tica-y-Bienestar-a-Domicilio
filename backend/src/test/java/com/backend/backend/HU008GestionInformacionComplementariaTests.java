package com.backend.backend;

import com.backend.backend.Model.categoriaModel;
import com.backend.backend.Model.enums.estadoCuentaModel;
import com.backend.backend.Model.enums.estadoServicioModel;
import com.backend.backend.Model.enums.rolModel;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas de aceptación de la HU-008: Gestión de información complementaria del servicio.
 *
 * Se ejecutan contra H2 en memoria (perfil "test") y levantan la cadena completa
 * de seguridad, controladores, servicios y repositorios.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class HU008GestionInformacionComplementariaTests {
    
    private static final String EMAIL_PROVEEDOR_1 = "proveedor1@hu008.test";
    private static final String EMAIL_PROVEEDOR_2 = "proveedor2@hu008.test";
    
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
    private servicioMultimediaRepository servicioMultimediaRepository;
    
    @Autowired
    private servicioInsumoRepository servicioInsumoRepository;
    
    private MockMvc mockMvc;
    
    private proveedorModel proveedor1;
    private proveedorModel proveedor2;
    private servicioModel servicioPropio;
    private servicioModel otroServicioPropio;
    private servicioModel servicioAjeno;
    
    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
            .webAppContextSetup(webApplicationContext)
            .apply(SecurityMockMvcConfigurers.springSecurity())
            .build();
        
        proveedor1 = crearProveedor(EMAIL_PROVEEDOR_1, "Laura", "Gómez");
        proveedor2 = crearProveedor(EMAIL_PROVEEDOR_2, "Andrés", "Pérez");
        
        categoriaModel categoria = new categoriaModel();
        categoria.setNombre("Masajes relajantes");
        categoria = categoriaRepository.save(categoria);
        
        servicioPropio = crearServicio(proveedor1, categoria, "Masaje relajante de prueba", "activo");
        otroServicioPropio = crearServicio(proveedor1, categoria, "Manicura de prueba", "activo");
        servicioAjeno = crearServicio(proveedor2, categoria, "Servicio del otro proveedor", "activo");
    }
    
    // ============================================================
    // CA-01: Asociación de fotografías
    // ============================================================
    
    @Test
    @DisplayName("CA-01: asocia fotografías y se consultan como parte de la información del servicio")
    void ca01AsociaFotografiasYSeConsultenConElServicio() throws Exception {
        mockMvc.perform(post("/api/servicios/{id}/multimedia", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tipo_archivo":"foto","url_archivo":"https://cdn.ejemplo.com/servicio/foto-1.jpg","orden":2}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").isNumber())
            .andExpect(jsonPath("$.tipo_archivo").value("foto"))
            .andExpect(jsonPath("$.url_archivo").value("https://cdn.ejemplo.com/servicio/foto-1.jpg"))
            .andExpect(jsonPath("$.orden").value(2));
        
        // Segunda fotografía sin orden explícito: debe asignarse uno posterior
        mockMvc.perform(post("/api/servicios/{id}/multimedia", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tipo_archivo":"foto","url_archivo":"https://cdn.ejemplo.com/servicio/foto-2.jpg"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.orden").value(3));
        
        mockMvc.perform(get("/api/servicios/{id}/multimedia", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].tipo_archivo").value("foto"))
            .andExpect(jsonPath("$[0].orden").value(2))
            .andExpect(jsonPath("$[1].orden").value(3));
        
        // El detalle del servicio propio también incluye la multimedia
        mockMvc.perform(get("/api/servicios/{id}", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.multimedia", hasSize(2)))
            .andExpect(jsonPath("$.multimedia[0].url_archivo").value("https://cdn.ejemplo.com/servicio/foto-1.jpg"));
        
        assertEquals(2, servicioMultimediaRepository.findByServicio(servicioPropio).size());
    }
    
    // ============================================================
    // CA-02: Asociación de videos
    // ============================================================
    
    @Test
    @DisplayName("CA-02: asocia videos de referencia y se consultan como parte de la información del servicio")
    void ca02AsociaVideosYSeConsultenConElServicio() throws Exception {
        mockMvc.perform(post("/api/servicios/{id}/multimedia", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tipo_archivo":"video","url_archivo":"https://www.youtube.com/watch?v=referencia","orden":1}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.tipo_archivo").value("video"));
        
        mockMvc.perform(get("/api/servicios/{id}/multimedia", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].tipo_archivo").value("video"))
            .andExpect(jsonPath("$[0].url_archivo").value("https://www.youtube.com/watch?v=referencia"));
    }
    
    // ============================================================
    // CA-03: Registro de productos, insumos o equipos
    // ============================================================
    
    @Test
    @DisplayName("CA-03: registra productos, insumos y equipos, y se consultan con el detalle del servicio")
    void ca03RegistraProductosInsumosYEquipos() throws Exception {
        mockMvc.perform(post("/api/servicios/{id}/insumos", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nombre":"Aceite esencial de lavanda","tipo":"producto"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.nombre").value("Aceite esencial de lavanda"))
            .andExpect(jsonPath("$.tipo").value("producto"));
        
        mockMvc.perform(post("/api/servicios/{id}/insumos", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nombre":"Toallas de algodón","tipo":"insumo"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.tipo").value("insumo"));
        
        mockMvc.perform(post("/api/servicios/{id}/insumos", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nombre":"Camilla portátil","tipo":"equipo"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.tipo").value("equipo"));
        
        mockMvc.perform(get("/api/servicios/{id}/insumos", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(3)))
            .andExpect(jsonPath("$[0].tipo").value("producto"))
            .andExpect(jsonPath("$[1].tipo").value("insumo"))
            .andExpect(jsonPath("$[2].tipo").value("equipo"));
        
        mockMvc.perform(get("/api/servicios/{id}", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.insumos", hasSize(3)));
        
        assertEquals(3, servicioInsumoRepository.findByServicio(servicioPropio).size());
    }
    
    @Test
    @DisplayName("CA-03: el detalle público del servicio expone multimedia e insumos para los clientes")
    void ca03DetallePublicoExponeInformacionComplementaria() throws Exception {
        guardarMultimedia(servicioPropio, tipoArchivoModel.foto,
            "https://cdn.ejemplo.com/servicio/foto-principal.jpg", 0);
        guardarMultimedia(servicioPropio, tipoArchivoModel.video,
            "https://cdn.ejemplo.com/servicio/video-principal.mp4", 1);
        guardarInsumo(servicioPropio, "Crema hidratante", tipoInsumoModel.producto);
        guardarInsumo(servicioPropio, "Camilla", tipoInsumoModel.equipo);
        
        mockMvc.perform(get("/api/exploracion/servicios/{id}", servicioPropio.getId_servicio()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.multimedia", hasSize(2)))
            .andExpect(jsonPath("$.multimedia[0].tipo_archivo").value("foto"))
            .andExpect(jsonPath("$.multimedia[1].tipo_archivo").value("video"))
            .andExpect(jsonPath("$.insumos", hasSize(2)))
            .andExpect(jsonPath("$.insumos[0].tipo").value("producto"))
            .andExpect(jsonPath("$.insumos[1].tipo").value("equipo"));
    }
    
    // ============================================================
    // CA-04: Gestión de información de un servicio ajeno
    // ============================================================
    
    @Test
    @DisplayName("CA-04: un proveedor no puede asociar multimedia al servicio de otro proveedor")
    void ca04ProveedorAjenoNoPuedeAsociarMultimedia() throws Exception {
        mockMvc.perform(post("/api/servicios/{id}/multimedia", servicioAjeno.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tipo_archivo":"foto","url_archivo":"https://cdn.ejemplo.com/intruso.jpg"}
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error", containsString("no pertenece a tu catálogo")));
        
        assertEquals(0, servicioMultimediaRepository.findByServicio(servicioAjeno).size());
        
        // Tampoco puede consultar la multimedia del servicio ajeno
        mockMvc.perform(get("/api/servicios/{id}/multimedia", servicioAjeno.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor")))
            .andExpect(status().isForbidden());
    }
    
    @Test
    @DisplayName("CA-04: un proveedor no puede asociar insumos al servicio de otro proveedor")
    void ca04ProveedorAjenoNoPuedeAsociarInsumo() throws Exception {
        mockMvc.perform(post("/api/servicios/{id}/insumos", servicioAjeno.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nombre":"Producto intruso","tipo":"producto"}
                    """))
            .andExpect(status().isForbidden());
        
        assertEquals(0, servicioInsumoRepository.findByServicio(servicioAjeno).size());
        
        // El servicio ajeno no se modificó
        servicioModel sinCambios = servicioRepository.findById(servicioAjeno.getId_servicio()).orElseThrow();
        assertEquals("Servicio del otro proveedor", sinCambios.getNombre());
        assertEquals(0, servicioMultimediaRepository.findByServicio(sinCambios).size());
        assertEquals(0, servicioInsumoRepository.findByServicio(sinCambios).size());
        
        // Tampoco puede consultar los insumos del servicio ajeno
        mockMvc.perform(get("/api/servicios/{id}/insumos", servicioAjeno.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor")))
            .andExpect(status().isForbidden());
    }
    
    @Test
    @DisplayName("CA-04: un proveedor no puede modificar ni eliminar multimedia de otro de sus servicios")
    void ca04NoPuedeModificarRecursoDeOtroServicio() throws Exception {
        servicio_multimediaModel multimedia = guardarMultimedia(
            otroServicioPropio, tipoArchivoModel.foto, "https://cdn.ejemplo.com/otro.jpg", 0);
        
        mockMvc.perform(put("/api/servicios/{id}/multimedia/{idMultimedia}",
                servicioPropio.getId_servicio(), multimedia.getId_multimedia())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tipo_archivo":"foto","url_archivo":"https://cdn.ejemplo.com/modificada.jpg"}
                    """))
            .andExpect(status().isNotFound());
        
        mockMvc.perform(delete("/api/servicios/{id}/multimedia/{idMultimedia}",
                servicioPropio.getId_servicio(), multimedia.getId_multimedia())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor")))
            .andExpect(status().isNotFound());
        
        servicio_multimediaModel sinCambios = servicioMultimediaRepository
            .findById(multimedia.getId_multimedia()).orElseThrow();
        assertEquals("https://cdn.ejemplo.com/otro.jpg", sinCambios.getUrl_archivo());
    }
    
    // ============================================================
    // CA-05: Acceso sin autenticación
    // ============================================================
    
    @Test
    @DisplayName("CA-05: sin sesión autenticada no se puede asociar multimedia ni insumos")
    void ca05SinAutenticacionNoPuedeAsociarInformacion() throws Exception {
        mockMvc.perform(post("/api/servicios/{id}/multimedia", servicioPropio.getId_servicio())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tipo_archivo":"foto","url_archivo":"https://cdn.ejemplo.com/sin-sesion.jpg"}
                    """))
            .andExpect(status().isUnauthorized());
        
        mockMvc.perform(post("/api/servicios/{id}/insumos", servicioPropio.getId_servicio())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nombre":"Insumo sin sesión","tipo":"insumo"}
                    """))
            .andExpect(status().isUnauthorized());
        
        assertEquals(0, servicioMultimediaRepository.findByServicio(servicioPropio).size());
        assertEquals(0, servicioInsumoRepository.findByServicio(servicioPropio).size());
    }
    
    @Test
    @DisplayName("CA-05: un usuario con rol cliente no puede gestionar información complementaria")
    void ca05ClienteNoPuedeGestionarInformacionComplementaria() throws Exception {
        mockMvc.perform(post("/api/servicios/{id}/multimedia", servicioPropio.getId_servicio())
                .with(user("cliente@hu008.test").roles("cliente"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tipo_archivo":"foto","url_archivo":"https://cdn.ejemplo.com/cliente.jpg"}
                    """))
            .andExpect(status().isForbidden());
        
        assertEquals(0, servicioMultimediaRepository.findByServicio(servicioPropio).size());
    }
    
    // ============================================================
    // Actualización y eliminación (gestión completa)
    // ============================================================
    
    @Test
    @DisplayName("Actualiza y elimina la multimedia de un servicio propio")
    void actualizaYEliminaMultimediaPropia() throws Exception {
        servicio_multimediaModel multimedia = guardarMultimedia(
            servicioPropio, tipoArchivoModel.foto, "https://cdn.ejemplo.com/antes.jpg", 4);
        
        mockMvc.perform(put("/api/servicios/{id}/multimedia/{idMultimedia}",
                servicioPropio.getId_servicio(), multimedia.getId_multimedia())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tipo_archivo":"video","url_archivo":"https://cdn.ejemplo.com/despues.mp4","orden":9}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tipo_archivo").value("video"))
            .andExpect(jsonPath("$.url_archivo").value("https://cdn.ejemplo.com/despues.mp4"))
            .andExpect(jsonPath("$.orden").value(9));
        
        mockMvc.perform(delete("/api/servicios/{id}/multimedia/{idMultimedia}",
                servicioPropio.getId_servicio(), multimedia.getId_multimedia())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor")))
            .andExpect(status().isNoContent());
        
        assertTrue(servicioMultimediaRepository.findById(multimedia.getId_multimedia()).isEmpty());
    }
    
    @Test
    @DisplayName("Actualiza y elimina productos, insumos o equipos de un servicio propio")
    void actualizaYEliminaInsumoPropio() throws Exception {
        servicio_insumoModel insumo = guardarInsumo(
            servicioPropio, "Toalla pequeña", tipoInsumoModel.insumo);
        
        mockMvc.perform(put("/api/servicios/{id}/insumos/{idInsumo}",
                servicioPropio.getId_servicio(), insumo.getId_insumo())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nombre":"Toalla grande de microfibra","tipo":"equipo"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nombre").value("Toalla grande de microfibra"))
            .andExpect(jsonPath("$.tipo").value("equipo"));
        
        mockMvc.perform(delete("/api/servicios/{id}/insumos/{idInsumo}",
                servicioPropio.getId_servicio(), insumo.getId_insumo())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor")))
            .andExpect(status().isNoContent());
        
        assertTrue(servicioInsumoRepository.findById(insumo.getId_insumo()).isEmpty());
    }
    
    // ============================================================
    // Validaciones de entrada
    // ============================================================
    
    @Test
    @DisplayName("Rechaza una fotografía sin URL válida")
    void rechazaMultimediaSinUrlValida() throws Exception {
        mockMvc.perform(post("/api/servicios/{id}/multimedia", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tipo_archivo":"foto","url_archivo":"no-es-una-url"}
                    """))
            .andExpect(status().isBadRequest());
        
        assertEquals(0, servicioMultimediaRepository.findByServicio(servicioPropio).size());
    }
    
    @Test
    @DisplayName("Rechaza un tipo de archivo o de insumo no permitido")
    void rechazaTiposNoPermitidos() throws Exception {
        mockMvc.perform(post("/api/servicios/{id}/multimedia", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"tipo_archivo":"documento","url_archivo":"https://cdn.ejemplo.com/doc.pdf"}
                    """))
            .andExpect(status().isBadRequest());
        
        mockMvc.perform(post("/api/servicios/{id}/insumos", servicioPropio.getId_servicio())
                .with(user(EMAIL_PROVEEDOR_1).roles("proveedor"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"nombre":"Elemento inválido","tipo":"herramienta"}
                    """))
            .andExpect(status().isBadRequest());
    }
    
    // ============================================================
    // Utilidades de siembra de datos
    // ============================================================
    
    private proveedorModel crearProveedor(String email, String nombre, String apellido) {
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
        proveedor.setPerfil_profesional("Perfil profesional de " + nombre);
        proveedor = proveedorRepository.save(proveedor);
        
        assertNotNull(proveedor.getId_proveedor());
        return proveedor;
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
    
    private servicio_multimediaModel guardarMultimedia(servicioModel servicio, tipoArchivoModel tipo,
                                                       String url, Integer orden) {
        servicio_multimediaModel multimedia = new servicio_multimediaModel();
        multimedia.setServicio(servicio);
        multimedia.setTipo_archivo(tipo);
        multimedia.setUrl_archivo(url);
        multimedia.setOrden(orden);
        return servicioMultimediaRepository.save(multimedia);
    }
    
    private servicio_insumoModel guardarInsumo(servicioModel servicio, String nombre, tipoInsumoModel tipo) {
        servicio_insumoModel insumo = new servicio_insumoModel();
        insumo.setServicio(servicio);
        insumo.setNombre(nombre);
        insumo.setTipo(tipo);
        return servicioInsumoRepository.save(insumo);
    }
}
