USE proyecto_servicios_domicilio;
SET NAMES utf8mb4;

START TRANSACTION;

INSERT INTO categoria (nombre) VALUES
('Uñas'),
('Cabello'),
('Maquillaje'),
('Masajes'),
('Barbería'),
('Tratamientos faciales')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

SELECT id_categoria INTO @cat_unas FROM categoria WHERE nombre = 'Uñas';
SELECT id_categoria INTO @cat_cabello FROM categoria WHERE nombre = 'Cabello';
SELECT id_categoria INTO @cat_maquillaje FROM categoria WHERE nombre = 'Maquillaje';
SELECT id_categoria INTO @cat_masajes FROM categoria WHERE nombre = 'Masajes';
SELECT id_categoria INTO @cat_barberia FROM categoria WHERE nombre = 'Barbería';

INSERT INTO usuario (email, password_hash, rol, nombre, apellido, telefono, estado_cuenta) VALUES
('cliente.demo@estetica.com', '$2a$10$hibLYTvquolocB0iv6PwROggaaXoIq43YfHd2DedAvjx6oMu4TstC', 'cliente', 'Cliente', 'Demo', '3001112233', 'activo'),
('proveedor.demo@estetica.com', '$2a$10$hibLYTvquolocB0iv6PwROggaaXoIq43YfHd2DedAvjx6oMu4TstC', 'proveedor', 'Valentina', 'Gómez', '3002223344', 'activo'),
('proveedor.demo2@estetica.com', '$2a$10$hibLYTvquolocB0iv6PwROggaaXoIq43YfHd2DedAvjx6oMu4TstC', 'proveedor', 'Carlos', 'Pérez', '3003334455', 'activo')
ON DUPLICATE KEY UPDATE
password_hash = VALUES(password_hash),
rol = VALUES(rol),
nombre = VALUES(nombre),
apellido = VALUES(apellido),
telefono = VALUES(telefono),
estado_cuenta = VALUES(estado_cuenta);

SELECT id_usuario INTO @id_cliente FROM usuario WHERE email = 'cliente.demo@estetica.com';
SELECT id_usuario INTO @id_prov1 FROM usuario WHERE email = 'proveedor.demo@estetica.com';
SELECT id_usuario INTO @id_prov2 FROM usuario WHERE email = 'proveedor.demo2@estetica.com';

INSERT IGNORE INTO cliente (id_cliente) VALUES (@id_cliente);

SET @tiene_id_cliente = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'direccion' AND COLUMN_NAME = 'id_cliente'
);

SET @sql_direccion = IF(@tiene_id_cliente > 0,
  CONCAT(
    'INSERT INTO direccion (id_cliente, cliente_id_cliente, es_principal, telefono, ciudad, barrio_sector, informacion_complementaria) ',
    'SELECT ', @id_cliente, ', ', @id_cliente, ', 1, ''3001112233'', ''Bogotá'', ''Chapinero'', ''Apartamento 201'' ',
    'WHERE NOT EXISTS (SELECT 1 FROM direccion WHERE cliente_id_cliente = ', @id_cliente, ' AND es_principal = 1)'
  ),
  CONCAT(
    'INSERT INTO direccion (cliente_id_cliente, es_principal, telefono, ciudad, barrio_sector, informacion_complementaria) ',
    'SELECT ', @id_cliente, ', 1, ''3001112233'', ''Bogotá'', ''Chapinero'', ''Apartamento 201'' ',
    'WHERE NOT EXISTS (SELECT 1 FROM direccion WHERE cliente_id_cliente = ', @id_cliente, ' AND es_principal = 1)'
  )
);

PREPARE stmt_direccion FROM @sql_direccion;
EXECUTE stmt_direccion;
DEALLOCATE PREPARE stmt_direccion;

INSERT INTO proveedor (id_proveedor, perfil_profesional) VALUES
(@id_prov1, 'Especialista en uñas, maquillaje y cuidado personal a domicilio.'),
(@id_prov2, 'Barbero y masajista profesional con atención a domicilio.')
ON DUPLICATE KEY UPDATE perfil_profesional = VALUES(perfil_profesional);

INSERT INTO recuperacion_password (id_usuario, codigo_token, fecha_expiracion, usado)
SELECT @id_cliente, 'DEMO-OTP-123456', DATE_ADD(NOW(), INTERVAL 30 MINUTE), 0
WHERE NOT EXISTS (
  SELECT 1 FROM recuperacion_password WHERE codigo_token = 'DEMO-OTP-123456'
);

INSERT INTO zona_cobertura (ciudad, barrio_sector, id_proveedor)
SELECT 'Bogotá', 'Chapinero', @id_prov1
WHERE NOT EXISTS (
  SELECT 1 FROM zona_cobertura WHERE id_proveedor = @id_prov1 AND ciudad = 'Bogotá' AND barrio_sector = 'Chapinero'
);

INSERT INTO zona_cobertura (ciudad, barrio_sector, id_proveedor)
SELECT 'Bogotá', 'Usaquén', @id_prov1
WHERE NOT EXISTS (
  SELECT 1 FROM zona_cobertura WHERE id_proveedor = @id_prov1 AND ciudad = 'Bogotá' AND barrio_sector = 'Usaquén'
);

INSERT INTO zona_cobertura (ciudad, barrio_sector, id_proveedor)
SELECT 'Bogotá', 'Suba', @id_prov2
WHERE NOT EXISTS (
  SELECT 1 FROM zona_cobertura WHERE id_proveedor = @id_prov2 AND ciudad = 'Bogotá' AND barrio_sector = 'Suba'
);

INSERT INTO disponibilidad (dia_semana, hora_inicio, hora_fin, id_proveedor)
SELECT d.dia, d.inicio, d.fin, @id_prov1
FROM (
  SELECT 'lunes' AS dia, '08:00:00' AS inicio, '18:00:00' AS fin
  UNION ALL SELECT 'miercoles', '08:00:00', '18:00:00'
  UNION ALL SELECT 'viernes', '08:00:00', '18:00:00'
  UNION ALL SELECT 'sabado', '09:00:00', '14:00:00'
) d
WHERE NOT EXISTS (
  SELECT 1 FROM disponibilidad x
  WHERE x.id_proveedor = @id_prov1 AND x.dia_semana = d.dia AND x.hora_inicio = d.inicio AND x.hora_fin = d.fin
);

INSERT INTO disponibilidad (dia_semana, hora_inicio, hora_fin, id_proveedor)
SELECT d.dia, d.inicio, d.fin, @id_prov2
FROM (
  SELECT 'martes' AS dia, '09:00:00' AS inicio, '19:00:00' AS fin
  UNION ALL SELECT 'jueves', '09:00:00', '19:00:00'
  UNION ALL SELECT 'sabado', '09:00:00', '17:00:00'
) d
WHERE NOT EXISTS (
  SELECT 1 FROM disponibilidad x
  WHERE x.id_proveedor = @id_prov2 AND x.dia_semana = d.dia AND x.hora_inicio = d.inicio AND x.hora_fin = d.fin
);

INSERT INTO periodo_no_disponible (id_proveedor, fecha_inicio, fecha_fin)
SELECT @id_prov2, DATE_ADD(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 22 DAY)
WHERE NOT EXISTS (
  SELECT 1 FROM periodo_no_disponible
  WHERE id_proveedor = @id_prov2
    AND fecha_inicio = DATE_ADD(CURDATE(), INTERVAL 20 DAY)
    AND fecha_fin = DATE_ADD(CURDATE(), INTERVAL 22 DAY)
);

INSERT INTO servicio (id_categoria, nombre, descripcion, duracion_minutos, precio, estado, id_proveedor)
SELECT @cat_unas, 'Manicure semipermanente', 'Manicure completo con esmaltado semipermanente y diseño básico.', 60, 45000.00, 'activo', @id_prov1
WHERE NOT EXISTS (
  SELECT 1 FROM servicio WHERE nombre = 'Manicure semipermanente' AND id_proveedor = @id_prov1
);

INSERT INTO servicio (id_categoria, nombre, descripcion, duracion_minutos, precio, estado, id_proveedor)
SELECT @cat_maquillaje, 'Maquillaje social', 'Maquillaje profesional para eventos y ocasiones especiales.', 90, 80000.00, 'activo', @id_prov1
WHERE NOT EXISTS (
  SELECT 1 FROM servicio WHERE nombre = 'Maquillaje social' AND id_proveedor = @id_prov1
);

INSERT INTO servicio (id_categoria, nombre, descripcion, duracion_minutos, precio, estado, id_proveedor)
SELECT @cat_cabello, 'Corte de cabello clásico', 'Corte personalizado con lavado y secado.', 45, 35000.00, 'activo', @id_prov2
WHERE NOT EXISTS (
  SELECT 1 FROM servicio WHERE nombre = 'Corte de cabello clásico' AND id_proveedor = @id_prov2
);

INSERT INTO servicio (id_categoria, nombre, descripcion, duracion_minutos, precio, estado, id_proveedor)
SELECT @cat_masajes, 'Masaje relajante', 'Masaje corporal relajante con aceites esenciales.', 60, 70000.00, 'activo', @id_prov2
WHERE NOT EXISTS (
  SELECT 1 FROM servicio WHERE nombre = 'Masaje relajante' AND id_proveedor = @id_prov2
);

SELECT id_servicio INTO @serv_manicure FROM servicio WHERE nombre = 'Manicure semipermanente' AND id_proveedor = @id_prov1 LIMIT 1;
SELECT id_servicio INTO @serv_maquillaje FROM servicio WHERE nombre = 'Maquillaje social' AND id_proveedor = @id_prov1 LIMIT 1;
SELECT id_servicio INTO @serv_corte FROM servicio WHERE nombre = 'Corte de cabello clásico' AND id_proveedor = @id_prov2 LIMIT 1;
SELECT id_servicio INTO @serv_masaje FROM servicio WHERE nombre = 'Masaje relajante' AND id_proveedor = @id_prov2 LIMIT 1;

INSERT INTO servicio_multimedia (id_servicio, tipo_archivo, url_archivo, orden)
SELECT @serv_manicure, 'foto', 'https://picsum.photos/seed/manicure-demo/800/600', 0
WHERE NOT EXISTS (
  SELECT 1 FROM servicio_multimedia WHERE id_servicio = @serv_manicure AND url_archivo = 'https://picsum.photos/seed/manicure-demo/800/600'
);

INSERT INTO servicio_multimedia (id_servicio, tipo_archivo, url_archivo, orden)
SELECT @serv_maquillaje, 'foto', 'https://picsum.photos/seed/maquillaje-demo/800/600', 0
WHERE NOT EXISTS (
  SELECT 1 FROM servicio_multimedia WHERE id_servicio = @serv_maquillaje AND url_archivo = 'https://picsum.photos/seed/maquillaje-demo/800/600'
);

INSERT INTO servicio_multimedia (id_servicio, tipo_archivo, url_archivo, orden)
SELECT @serv_corte, 'foto', 'https://picsum.photos/seed/corte-demo/800/600', 0
WHERE NOT EXISTS (
  SELECT 1 FROM servicio_multimedia WHERE id_servicio = @serv_corte AND url_archivo = 'https://picsum.photos/seed/corte-demo/800/600'
);

INSERT INTO servicio_multimedia (id_servicio, tipo_archivo, url_archivo, orden)
SELECT @serv_masaje, 'foto', 'https://picsum.photos/seed/masaje-demo/800/600', 0
WHERE NOT EXISTS (
  SELECT 1 FROM servicio_multimedia WHERE id_servicio = @serv_masaje AND url_archivo = 'https://picsum.photos/seed/masaje-demo/800/600'
);

INSERT INTO servicio_insumo (id_servicio, nombre, tipo)
SELECT @serv_manicure, 'Esmalte semipermanente', 'insumo'
WHERE NOT EXISTS (
  SELECT 1 FROM servicio_insumo WHERE id_servicio = @serv_manicure AND nombre = 'Esmalte semipermanente'
);

INSERT INTO servicio_insumo (id_servicio, nombre, tipo)
SELECT @serv_manicure, 'Lámpara UV', 'equipo'
WHERE NOT EXISTS (
  SELECT 1 FROM servicio_insumo WHERE id_servicio = @serv_manicure AND nombre = 'Lámpara UV'
);

INSERT INTO servicio_insumo (id_servicio, nombre, tipo)
SELECT @serv_maquillaje, 'Kit de maquillaje profesional', 'equipo'
WHERE NOT EXISTS (
  SELECT 1 FROM servicio_insumo WHERE id_servicio = @serv_maquillaje AND nombre = 'Kit de maquillaje profesional'
);

INSERT INTO servicio_insumo (id_servicio, nombre, tipo)
SELECT @serv_corte, 'Máquina de corte', 'equipo'
WHERE NOT EXISTS (
  SELECT 1 FROM servicio_insumo WHERE id_servicio = @serv_corte AND nombre = 'Máquina de corte'
);

INSERT INTO servicio_insumo (id_servicio, nombre, tipo)
SELECT @serv_masaje, 'Aceites esenciales', 'insumo'
WHERE NOT EXISTS (
  SELECT 1 FROM servicio_insumo WHERE id_servicio = @serv_masaje AND nombre = 'Aceites esenciales'
);

INSERT INTO solicitud_reserva (
  id_servicio,
  nombre_servicio_snapshot,
  precio_snapshot,
  duracion_snapshot_minutos,
  fecha_hora_solicitada,
  direccion_texto,
  barrio_sector,
  informacion_complementaria,
  observaciones,
  estado,
  id_cliente,
  id_proveedor
)
SELECT
  @serv_manicure,
  'Manicure semipermanente',
  45000.00,
  60,
  DATE_ADD(DATE_ADD(CURDATE(), INTERVAL 3 DAY), INTERVAL 10 HOUR),
  'Calle 123 #45-67',
  'Chapinero',
  'Apartamento 201',
  'Por favor confirmar disponibilidad',
  'pendiente',
  @id_cliente,
  @id_prov1
WHERE NOT EXISTS (
  SELECT 1 FROM solicitud_reserva
  WHERE id_cliente = @id_cliente AND id_servicio = @serv_manicure AND estado = 'pendiente'
);

INSERT INTO token_invalido (token)
SELECT 'demo-token-invalidado'
WHERE NOT EXISTS (
  SELECT 1 FROM token_invalido WHERE token = 'demo-token-invalidado'
);

COMMIT;

SELECT
  (SELECT COUNT(*) FROM usuario WHERE email IN ('cliente.demo@estetica.com', 'proveedor.demo@estetica.com', 'proveedor.demo2@estetica.com')) AS usuarios_demo,
  (SELECT COUNT(*) FROM direccion WHERE cliente_id_cliente = @id_cliente) AS direcciones_demo,
  (SELECT COUNT(*) FROM servicio WHERE id_proveedor IN (@id_prov1, @id_prov2)) AS servicios_demo,
  (SELECT COUNT(*) FROM disponibilidad WHERE id_proveedor IN (@id_prov1, @id_prov2)) AS franjas_demo,
  (SELECT COUNT(*) FROM periodo_no_disponible WHERE id_proveedor IN (@id_prov1, @id_prov2)) AS periodos_demo,
  (SELECT COUNT(*) FROM solicitud_reserva WHERE id_cliente = @id_cliente) AS solicitudes_demo,
  (SELECT COUNT(*) FROM recuperacion_password WHERE codigo_token = 'DEMO-OTP-123456') AS recuperaciones_demo,
  (SELECT COUNT(*) FROM token_invalido WHERE token = 'demo-token-invalidado') AS tokens_invalidos_demo;
