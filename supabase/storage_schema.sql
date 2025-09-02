CREATE POLICY "Los usuarios autenticados pueden leer facturas"
ON storage.objects FOR SELECT
TO authenticated
USING (
  (bucket_id = 'facturas'::text)
);

CREATE POLICY "Los usuarios autenticados pueden subir facturas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'facturas'::text)
);

CREATE POLICY "Los usuarios autenticados pueden leer activos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  (bucket_id = 'activos'::text)
);

CREATE POLICY "Los usuarios autenticados pueden subir a activos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'activos'::text)
);

CREATE POLICY "Los usuarios autenticados pueden leer evidencias"
ON storage.objects FOR SELECT
TO authenticated
USING (
  (bucket_id = 'evidencias'::text)
);

CREATE POLICY "Los usuarios autenticados pueden subir evidencias"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id = 'evidencias'::text)
);