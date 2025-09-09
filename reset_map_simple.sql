-- Script simple para limpiar el mapa y empezar de nuevo
-- Ejecuta este script completo

-- Limpiar datos del mapa
DELETE FROM map_items;
DELETE FROM map_floors;

-- Crear un piso limpio
INSERT INTO map_floors (id, name, company_id, created_at, updated_at)
VALUES ('floor-clean', 'Piso Principal', (SELECT id FROM companies LIMIT 1), NOW(), NOW());

-- Agregar algunos equipos de prueba
INSERT INTO equipos (nombre, codigo_activo, estado, tipo, ubicacion, company_id, created_at, updated_at) VALUES
('Servidor Web', 'SRV-WEB-01', 'activo', 'servidor', 'Sala de Servidores', (SELECT id FROM companies LIMIT 1), NOW(), NOW()),
('PC Administrativa', 'PC-ADM-01', 'activo', 'computadora', 'Oficina Principal', (SELECT id FROM companies LIMIT 1), NOW(), NOW()),
('Impresora HP', 'IMP-HP-01', 'activo', 'impresora', 'Oficina Principal', (SELECT id FROM companies LIMIT 1), NOW(), NOW()),
('Router Cisco', 'RTR-CISCO-01', 'activo', 'red', 'Sala de Servidores', (SELECT id FROM companies LIMIT 1), NOW(), NOW());

-- Verificar resultados
SELECT 'Mapa limpiado y equipos agregados' as resultado;
SELECT COUNT(*) as equipos_disponibles FROM equipos;
SELECT COUNT(*) as pisos_creados FROM map_floors;
