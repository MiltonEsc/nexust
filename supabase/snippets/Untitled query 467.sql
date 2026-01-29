-- Create the table for Purchases (Compras)
create table public.compras (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Required columns from Excel
  fecha_ingreso date,
  descripcion text,           -- DESCRIPTION OF ITEM
  cantidad integer default 0,
  cantidad_stock integer default 0, -- CANTIDAD EN STOCK
  marca text,
  modelo text,
  serial text,
  proveedor text,
  numero_proveedor text,      -- NUMERO DE PROVEEDOR
  area_destino text,
  usuario_asignado text,      -- Could store name or ID string
  orden_compra text,          -- ORDEN DE COMPRA
  valor numeric default 0,    -- VALOR
  vida_util text,             -- Vida util
  
  -- System columns
  company_id uuid references public.companies(id) on delete cascade
);

-- Enable RLS (Row Level Security)
alter table public.compras enable row level security;

-- Policy: Users can view purchases for their company
create policy "Users can view company purchases"
  on public.compras for select
  using (
    company_id in (
      select company_id from public.company_users 
      where user_id = auth.uid()
    )
  );

-- Policy: Users can insert purchases for their company
create policy "Users can insert company purchases"
  on public.compras for insert
  with check (
    company_id in (
      select company_id from public.company_users 
      where user_id = auth.uid()
    )
  );

-- Policy: Users can update purchases for their company
create policy "Users can update company purchases"
  on public.compras for update
  using (
    company_id in (
      select company_id from public.company_users 
      where user_id = auth.uid()
    )
  );

-- Policy: Users can delete purchases for their company
create policy "Users can delete company purchases"
  on public.compras for delete
  using (
    company_id in (
      select company_id from public.company_users 
      where user_id = auth.uid()
    )
  );
