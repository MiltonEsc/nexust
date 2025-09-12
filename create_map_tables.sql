-- Script para crear las tablas de mapas con soporte completo para capas
-- Ejecutar en Supabase SQL Editor

-- 1. Crear tabla map_floors
CREATE TABLE IF NOT EXISTS map_floors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla map_items con campos para capas
CREATE TABLE IF NOT EXISTS map_items (
    id TEXT PRIMARY KEY,
    floor_id TEXT NOT NULL REFERENCES map_floors(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('area', 'equipment')),
    name TEXT NOT NULL,
    asset_tag TEXT,
    status TEXT DEFAULT 'activo',
    icon TEXT DEFAULT 'default',
    x INTEGER DEFAULT 50,
    y INTEGER DEFAULT 50,
    width INTEGER DEFAULT 100,
    height INTEGER DEFAULT 80,
    background_color TEXT DEFAULT '#F3F4F6',
    border_color TEXT DEFAULT '#6B7280',
    text_color TEXT DEFAULT '#374151',
    is_locked BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT TRUE,
    opacity DECIMAL(3,2) DEFAULT 1.0 CHECK (opacity >= 0 AND opacity <= 1),
    is_empty BOOLEAN DEFAULT FALSE,
    equipo_id BIGINT REFERENCES equipos(id) ON DELETE SET NULL,
    original_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Crear tabla map_layers_order (ya existe, pero la incluimos por completitud)
CREATE TABLE IF NOT EXISTS map_layers_order (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    floor_id TEXT NOT NULL,
    layer_id TEXT NOT NULL,
    z_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, floor_id, layer_id)
);

-- 4. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_map_floors_company ON map_floors(company_id);
CREATE INDEX IF NOT EXISTS idx_map_items_floor ON map_items(floor_id);
CREATE INDEX IF NOT EXISTS idx_map_items_company ON map_items(company_id);
CREATE INDEX IF NOT EXISTS idx_map_items_type ON map_items(item_type);
CREATE INDEX IF NOT EXISTS idx_map_layers_order_company_floor ON map_layers_order(company_id, floor_id);
CREATE INDEX IF NOT EXISTS idx_map_layers_order_z_index ON map_layers_order(z_index);

-- 5. Crear triggers para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers solo si no existen
DO $$
BEGIN
    -- Trigger para map_floors
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_map_floors_updated_at') THEN
        CREATE TRIGGER trigger_update_map_floors_updated_at
            BEFORE UPDATE ON map_floors
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
    END IF;
    
    -- Trigger para map_items
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_map_items_updated_at') THEN
        CREATE TRIGGER trigger_update_map_items_updated_at
            BEFORE UPDATE ON map_items
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
    END IF;
    
    -- Trigger para map_layers_order (solo si no existe)
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_map_layers_order_updated_at') THEN
        CREATE TRIGGER trigger_update_map_layers_order_updated_at
            BEFORE UPDATE ON map_layers_order
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE map_floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_layers_order ENABLE ROW LEVEL SECURITY;

-- 7. Crear políticas RLS (solo si no existen)
DO $$
BEGIN
    -- Política para map_floors
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'map_floors' AND policyname = 'Users can manage floors for their company') THEN
        CREATE POLICY "Users can manage floors for their company" ON map_floors
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM company_users 
                    WHERE user_id = auth.uid() AND status = 'accepted'
                )
            );
    END IF;
    
    -- Política para map_items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'map_items' AND policyname = 'Users can manage items for their company') THEN
        CREATE POLICY "Users can manage items for their company" ON map_items
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM company_users 
                    WHERE user_id = auth.uid() AND status = 'accepted'
                )
            );
    END IF;
    
    -- Política para map_layers_order (solo si no existe)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'map_layers_order' AND policyname = 'Users can manage layer order for their company') THEN
        CREATE POLICY "Users can manage layer order for their company" ON map_layers_order
            FOR ALL USING (
                company_id IN (
                    SELECT company_id FROM company_users 
                    WHERE user_id = auth.uid() AND status = 'accepted'
                )
            );
    END IF;
END $$;

-- 8. Otorgar permisos
GRANT ALL ON TABLE map_floors TO anon;
GRANT ALL ON TABLE map_floors TO authenticated;
GRANT ALL ON TABLE map_floors TO service_role;

GRANT ALL ON TABLE map_items TO anon;
GRANT ALL ON TABLE map_items TO authenticated;
GRANT ALL ON TABLE map_items TO service_role;

GRANT ALL ON TABLE map_layers_order TO anon;
GRANT ALL ON TABLE map_layers_order TO authenticated;
GRANT ALL ON TABLE map_layers_order TO service_role;

-- 9. Comentarios en las tablas
COMMENT ON TABLE map_floors IS 'Tabla para guardar los pisos/plantas del mapa';
COMMENT ON TABLE map_items IS 'Tabla para guardar los elementos del mapa (áreas y equipos) con propiedades de capas';
COMMENT ON TABLE map_layers_order IS 'Tabla para guardar el orden (z_index) de las capas';

-- 10. Comentarios en campos importantes
COMMENT ON COLUMN map_items.is_locked IS 'Estado de bloqueo de la capa del elemento';
COMMENT ON COLUMN map_items.is_visible IS 'Estado de visibilidad de la capa del elemento';
COMMENT ON COLUMN map_items.opacity IS 'Nivel de opacidad de la capa del elemento (0.0 a 1.0)';

-- 11. Verificar que las tablas se crearon correctamente
SELECT 'Tablas de mapas creadas exitosamente' as status;
SELECT 'map_floors:' as table_name, COUNT(*) as total FROM map_floors;
SELECT 'map_items:' as table_name, COUNT(*) as total FROM map_items;
SELECT 'map_layers_order:' as table_name, COUNT(*) as total FROM map_layers_order;
