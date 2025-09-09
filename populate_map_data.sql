-- Script para poblar las tablas del mapa con datos de prueba
-- Ejecuta este script si las tablas están vacías

-- 1. Limpiar datos existentes (opcional)
-- DELETE FROM map_items;
-- DELETE FROM map_floors;

-- 2. Crear un piso de prueba
INSERT INTO map_floors (id, name, company_id, created_at, updated_at)
VALUES ('floor-test', 'Piso Principal', (SELECT id FROM companies LIMIT 1), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Crear algunas áreas de prueba
INSERT INTO map_items (id, floor_id, item_type, name, x, y, width, height, background_color, border_color, text_color, is_locked, is_empty, created_at, updated_at) VALUES
('area-test-1', 'floor-test', 'area', 'Oficina Principal', 50, 50, 400, 300, '#EFF6FF', '#3B82F6', '#1E3A8A', FALSE, FALSE, NOW(), NOW()),
('area-test-2', 'floor-test', 'area', 'Sala de Servidores', 500, 50, 300, 250, '#FEF2F2', '#EF4444', '#991B1B', FALSE, FALSE, NOW(), NOW()),
('area-test-3', 'floor-test', 'area', 'Recepción', 50, 400, 200, 150, '#F0FDF4', '#22C55E', '#166534', FALSE, FALSE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Crear un equipo vacío de prueba
INSERT INTO map_items (id, floor_id, item_type, name, x, y, width, height, background_color, border_color, text_color, is_locked, is_empty, asset_tag, status, icon, created_at, updated_at) VALUES
('equip-test-1', 'floor-test', 'equipment', 'Equipo Vacío', 100, 100, 100, 80, '#FEF3C7', '#F59E0B', '#92400E', FALSE, TRUE, '', 'activo', 'default', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Verificar que se crearon los datos
SELECT 'Datos creados exitosamente' as status;
SELECT 'Pisos:' as info, COUNT(*) as total FROM map_floors;
SELECT 'Elementos:' as info, COUNT(*) as total FROM map_items;
SELECT 'Áreas:' as info, COUNT(*) as total FROM map_items WHERE item_type = 'area';
SELECT 'Equipos:' as info, COUNT(*) as total FROM map_items WHERE item_type = 'equipment';
