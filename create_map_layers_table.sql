-- Script simplificado para guardar solo el orden de las capas existentes
-- Ejecutar en Supabase SQL Editor

-- Crear tabla map_layers_order solo para guardar el orden
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

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_map_layers_order_company_floor ON map_layers_order(company_id, floor_id);
CREATE INDEX IF NOT EXISTS idx_map_layers_order_z_index ON map_layers_order(z_index);

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_map_layers_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_map_layers_order_updated_at
    BEFORE UPDATE ON map_layers_order
    FOR EACH ROW
    EXECUTE FUNCTION update_map_layers_order_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE map_layers_order ENABLE ROW LEVEL SECURITY;

-- Crear política RLS simple
CREATE POLICY "Users can manage layer order for their company" ON map_layers_order
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM company_users 
            WHERE user_id = auth.uid() AND status = 'accepted'
        )
    );

-- Comentarios en la tabla
COMMENT ON TABLE map_layers_order IS 'Tabla para guardar solo el orden (z_index) de las capas existentes';
COMMENT ON COLUMN map_layers_order.company_id IS 'ID de la empresa propietaria';
COMMENT ON COLUMN map_layers_order.floor_id IS 'ID del piso';
COMMENT ON COLUMN map_layers_order.layer_id IS 'ID de la capa (areas, equipment, etc.)';
COMMENT ON COLUMN map_layers_order.z_index IS 'Orden de apilamiento (mayor valor = más arriba)';
