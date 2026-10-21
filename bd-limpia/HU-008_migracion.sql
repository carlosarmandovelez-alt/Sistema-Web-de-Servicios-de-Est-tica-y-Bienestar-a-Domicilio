-- HU-008: Gestión de información complementaria del servicio
-- Migración para bases de datos creadas antes de esta historia de usuario.
--
-- La tabla servicio_insumo ahora permite clasificar los elementos como
-- 'producto', 'insumo' o 'equipo'. Si la base de datos se crea desde
-- Entrega_ing_software_base_datos.sql, este cambio ya está incluido.

USE `proyecto_servicios_domicilio`;

ALTER TABLE `servicio_insumo`
  MODIFY COLUMN `tipo` ENUM('producto', 'insumo', 'equipo') NOT NULL DEFAULT 'insumo';
