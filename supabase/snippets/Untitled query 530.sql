-- Ver todos los items y su estado de bloqueo
SELECT id, name, item_type, is_locked, company_id
FROM map_items
ORDER BY updated_at DESC
LIMIT 20;