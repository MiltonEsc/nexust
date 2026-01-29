

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_company_and_add_owner"("company_name" "text") RETURNS "public"."companies"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_company companies;
BEGIN
  -- Inserta la nueva empresa y guarda la fila creada en la variable 'new_company'.
  INSERT INTO public.companies (name, owner_id)
  VALUES (company_name, auth.uid())
  RETURNING * INTO new_company;

  -- Crea el vínculo entre el usuario (dueño) y la nueva empresa.
  INSERT INTO public.company_users (company_id, user_id, role, status)
  VALUES (new_company.id, auth.uid(), 'owner', 'accepted');

  -- Devuelve la información completa de la nueva empresa a la aplicación.
  RETURN new_company;
END;
$$;


ALTER FUNCTION "public"."create_company_and_add_owner"("company_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_test_company"("company_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_company_id uuid;
BEGIN
  -- Insertar empresa directamente sin RLS
  INSERT INTO public.companies (name, owner_id)
  VALUES (company_name, '123e4567-e89b-12d3-a456-426614174000'::uuid)
  RETURNING id INTO new_company_id;
  
  RETURN new_company_id;
END;
$$;


ALTER FUNCTION "public"."create_test_company"("company_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_assets_with_depreciation"("p_company_id" "uuid") RETURNS TABLE("id" bigint, "activo" "text", "costo" numeric, "fecha_compra" "date", "vida_util" bigint, "valor_residual" numeric, "depreciacion_anual" numeric, "depreciacion_acumulada" numeric, "valor_actual" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.marca || ' ' || e.modelo AS activo,
        e.costo,
        e.fecha_compra,
        e.vida_util,
        e.valor_residual,
        
        -- Depreciación Anual: (Costo - Valor Residual) / Vida Útil
        CASE
            WHEN e.vida_util IS NOT NULL AND e.vida_util > 0 THEN
                (e.costo - e.valor_residual) / e.vida_util
            ELSE 0
        END AS depreciacion_anual,

        -- Depreciación Acumulada: Depreciación Anual * Años Transcurridos
        LEAST(
            (e.costo - e.valor_residual), 
            GREATEST(0, 
                (EXTRACT(epoch FROM AGE(CURRENT_DATE, e.fecha_compra)) / 31557600)
                * CASE
                    WHEN e.vida_util IS NOT NULL AND e.vida_util > 0 THEN
                        (e.costo - e.valor_residual) / e.vida_util
                    ELSE 0
                END
            )
        ) AS depreciacion_acumulada,

        -- Valor Actual en Libros: Costo - Depreciación Acumulada
        e.costo - LEAST(
            (e.costo - e.valor_residual),
            GREATEST(0, 
                (EXTRACT(epoch FROM AGE(CURRENT_DATE, e.fecha_compra)) / 31557600) 
                * CASE
                    WHEN e.vida_util IS NOT NULL AND e.vida_util > 0 THEN
                        (e.costo - e.valor_residual) / e.vida_util
                    ELSE 0
                END
            )
        ) AS valor_actual
    FROM
        public.equipos e
    WHERE
        e.company_id = p_company_id AND e.costo IS NOT NULL AND e.fecha_compra IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."get_assets_with_depreciation"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_combined_trazabilidad"("p_registro_id" bigint) RETURNS TABLE("fecha" timestamp with time zone, "accion" "text", "detalle" "text", "origen" "text", "evidencia_url" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    -- Parte 1: Obtener la trazabilidad directamente del usuario (registros)
    SELECT
        (log->>'fecha')::timestamptz AS fecha,
        log->>'accion' AS accion,
        log->>'detalle' AS detalle,
        'Usuario' AS origen,
        log->>'evidencia_url' AS evidencia_url
    FROM
        registros,
        jsonb_array_elements(registros.trazabilidad) AS log
    WHERE
        registros.id = p_registro_id

    UNION ALL -- Unimos los resultados con la siguiente consulta

    -- Parte 2: Obtener la trazabilidad del equipo asignado al usuario
    SELECT
        (log->>'fecha')::timestamptz AS fecha,
        log->>'accion' AS accion,
        log->>'detalle' AS detalle,
        'Equipo' AS origen,
        log->>'evidencia_url' AS evidencia_url
    FROM
        equipos,
        jsonb_array_elements(equipos.trazabilidad) AS log
    WHERE
        equipos.registro_id = p_registro_id

    -- Ordenamos el resultado final por fecha, del más reciente al más antiguo
    ORDER BY fecha DESC;
END;
$$;


ALTER FUNCTION "public"."get_combined_trazabilidad"("p_registro_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_company_members"("p_company_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "role" "text", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.company_id = p_company_id
      AND cu.user_id = auth.uid()
      AND cu.status = 'accepted'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    u.id as user_id, -- <-- CAMPO AÑADIDO
    u.email::text,
    cu.role,
    cu.status
  FROM
    public.company_users AS cu
  JOIN
    auth.users AS u ON cu.user_id = u.id
  WHERE
    cu.company_id = p_company_id;
END;
$$;


ALTER FUNCTION "public"."get_company_members"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_companies"() RETURNS SETOF "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- This query can be executed because the function is a SECURITY DEFINER
  RETURN QUERY SELECT company_id FROM public.company_users WHERE user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_my_companies"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_paginated_maintenance_logs"("p_company_id" "uuid", "p_page_number" integer, "p_page_size" integer) RETURNS TABLE("fecha" timestamp with time zone, "equipo_info" "text", "detalle" "text", "tecnico" "text", "log_id" "text", "evidencia_url" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        (log->>'fecha')::TIMESTAMPTZ AS fecha,
        e.marca || ' ' || e.modelo AS equipo_info,
        log->>'detalle' AS detalle,
        log->>'tecnico' AS tecnico,
        e.id::text || '-' || (log->>'fecha') AS log_id,
        log->>'evidencia_url' AS evidencia_url -- <-- SELECCIONAMOS EL NUEVO CAMPO
    FROM
        equipos e,
        jsonb_array_elements(e.trazabilidad) AS log
    WHERE
        e.company_id = p_company_id AND
        log->>'accion' = 'Mantenimiento'
    ORDER BY
        fecha DESC
    LIMIT p_page_size
    OFFSET (p_page_number - 1) * p_page_size;
END;
$$;


ALTER FUNCTION "public"."get_paginated_maintenance_logs"("p_company_id" "uuid", "p_page_number" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_registros_count"("p_company_id" "uuid", "p_search_term" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_count INT;
BEGIN
    SELECT INTO total_count COUNT(*)
    FROM
        registros r
    WHERE
        r.company_id = p_company_id AND
        (p_search_term = '' OR r.nombre ILIKE ('%' || p_search_term || '%') OR r.cargo ILIKE ('%' || p_search_term || '%') OR r.cedula ILIKE ('%' || p_search_term || '%'));
    RETURN total_count;
END;
$$;


ALTER FUNCTION "public"."get_registros_count"("p_company_id" "uuid", "p_search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_registros_details"() RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', r.id,
      'nombre', r.nombre,
      'cargo', r.cargo,
      'cedula', r.cedula,
      'fecha_ingreso', r.fecha_ingreso,
      'departamento', r.departamento,
      'cuentas_creadas', r.cuentas_creadas,
      'induccion_tic', r.induccion_tic,
      'trazabilidad', r.trazabilidad,
      'equipos', (SELECT json_build_object('id', e.id, 'marca', e.marca, 'modelo', e.modelo) FROM equipos e WHERE e.id = r.equipo_id),
      'software', (SELECT json_agg(s.*) FROM software s WHERE s.id = ANY(r.software_ids)),
      'perifericos', (SELECT json_agg(p.*) FROM perifericos p WHERE p.id = ANY(r.perifericos_ids))
    )
  )
  INTO result
  FROM registros r;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_registros_details"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_registros_paginated_and_filtered"("p_company_id" "uuid", "p_search_term" "text", "p_page_number" integer, "p_page_size" integer) RETURNS TABLE("id" bigint, "nombre" "text", "cargo" "text", "departamento" "text", "cedula" "text", "fecha_ingreso" "date", "induccion_tic" boolean, "cuentas_creadas" "text", "equipo_id" bigint, "software_ids" bigint[], "perifericos_ids" bigint[], "company_id" "uuid", "trazabilidad" "jsonb", "equipos" "jsonb", "software" "jsonb", "perifericos" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id, r.nombre, r.cargo, r.departamento, r.cedula, r.fecha_ingreso, r.induccion_tic, r.cuentas_creadas, r.equipo_id, r.software_ids, r.perifericos_ids, r.company_id, r.trazabilidad,
        
        CASE
            WHEN e.id IS NOT NULL THEN jsonb_build_object(
                'id', e.id,
                'marca', e.marca,
                'modelo', e.modelo,
                'numero_serie', e.numero_serie
            )
            ELSE NULL
        END AS equipos,
        
        (SELECT jsonb_agg(s) FROM software s WHERE s.id = ANY(r.software_ids)) AS software,
        (SELECT jsonb_agg(p) FROM perifericos p WHERE p.id = ANY(r.perifericos_ids)) AS perifericos
    FROM
        registros r
    LEFT JOIN
        equipos e ON r.equipo_id = e.id
    WHERE
        r.company_id = p_company_id AND
        (p_search_term = '' OR r.nombre ILIKE ('%' || p_search_term || '%') OR r.cargo ILIKE ('%' || p_search_term || '%') OR r.cedula ILIKE ('%' || p_search_term || '%'))
    ORDER BY
        r.nombre
    LIMIT p_page_size
    OFFSET (p_page_number - 1) * p_page_size;
END;
$$;


ALTER FUNCTION "public"."get_registros_paginated_and_filtered"("p_company_id" "uuid", "p_search_term" "text", "p_page_number" integer, "p_page_size" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_total_maintenance_logs_count"("p_company_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_count INT;
BEGIN
    SELECT INTO total_count COUNT(*)
    FROM
        equipos e,
        jsonb_array_elements(e.trazabilidad) AS log
    WHERE
        e.company_id = p_company_id AND
        log->>'accion' = 'Mantenimiento';
    RETURN total_count;
END;
$$;


ALTER FUNCTION "public"."get_total_maintenance_logs_count"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_id_by_email"("user_email" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT json_build_object('id', u.id)
    FROM auth.users AS u
    WHERE u.email = user_email
  );
END;
$$;


ALTER FUNCTION "public"."get_user_id_by_email"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_map_layers_order_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_map_layers_order_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_map_layers_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_map_layers_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_network_devices_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_network_devices_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_users" (
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."company_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consumibles" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "nombre" character varying NOT NULL,
    "categoria" character varying,
    "cantidad" integer DEFAULT 0 NOT NULL,
    "stock_minimo" integer DEFAULT 5,
    "proveedor_id" bigint,
    "costo" numeric(10,2),
    "fecha_compra" "date",
    "numero_factura" character varying,
    "ubicacion" character varying,
    "imagen" "text"
);


ALTER TABLE "public"."consumibles" OWNER TO "postgres";


ALTER TABLE "public"."consumibles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."consumibles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."equipos" (
    "id" bigint NOT NULL,
    "marca" "text",
    "modelo" "text",
    "numero_serie" "text",
    "estado" "text",
    "ubicacion" "text",
    "proveedor_id" bigint,
    "numero_factura" "text",
    "fecha_compra" "date",
    "fecha_vencimiento_garantia" "date",
    "imagen" "text",
    "trazabilidad" "jsonb" DEFAULT '[]'::"jsonb",
    "factura_pdf_url" "text",
    "costo" numeric,
    "company_id" "uuid",
    "vida_util" bigint,
    "valor_residual" numeric DEFAULT '0'::numeric,
    "registro_id" bigint,
    "x_coordinate" integer DEFAULT 0,
    "y_coordinate" integer DEFAULT 0,
    "codigo_interno" character varying(50),
    "persona_asignada" character varying(100)
);


ALTER TABLE "public"."equipos" OWNER TO "postgres";


COMMENT ON COLUMN "public"."equipos"."x_coordinate" IS 'Coordenada X en el mapa 2D (píxeles)';



COMMENT ON COLUMN "public"."equipos"."y_coordinate" IS 'Coordenada Y en el mapa 2D (píxeles)';



ALTER TABLE "public"."equipos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."equipos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."maintenance_logs" (
    "id" bigint NOT NULL,
    "company_id" "uuid",
    "equipo_id" bigint,
    "fecha" timestamp with time zone DEFAULT "now"() NOT NULL,
    "detalle" "text",
    "tecnico" "text",
    "evidencia_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."maintenance_logs" OWNER TO "postgres";


ALTER TABLE "public"."maintenance_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."maintenance_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."maintenance_schedules" (
    "id" bigint NOT NULL,
    "company_id" "uuid" NOT NULL,
    "equipo_id" bigint,
    "title" "text" NOT NULL,
    "periodicity" "text" DEFAULT 'custom'::"text" NOT NULL,
    "frequency_days" integer DEFAULT 0 NOT NULL,
    "next_date" "date" NOT NULL,
    "responsible" "text",
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."maintenance_schedules" OWNER TO "postgres";


ALTER TABLE "public"."maintenance_schedules" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."maintenance_schedules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."map_floors" (
    "id" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "company_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."map_floors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."map_items" (
    "id" character varying(255) NOT NULL,
    "floor_id" character varying(255),
    "item_type" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "x" integer DEFAULT 0 NOT NULL,
    "y" integer DEFAULT 0 NOT NULL,
    "width" integer DEFAULT 100 NOT NULL,
    "height" integer DEFAULT 80 NOT NULL,
    "background_color" character varying(7) DEFAULT '#F3F4F6'::character varying,
    "border_color" character varying(7) DEFAULT '#6B7280'::character varying,
    "text_color" character varying(7) DEFAULT '#374151'::character varying,
    "is_locked" boolean DEFAULT false,
    "is_empty" boolean DEFAULT false,
    "equipo_id" bigint,
    "asset_tag" character varying(255),
    "status" character varying(50) DEFAULT 'activo'::character varying,
    "icon" character varying(50) DEFAULT 'default'::character varying,
    "original_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    "is_visible" boolean DEFAULT true,
    "opacity" numeric(3,2) DEFAULT 1.0,
    CONSTRAINT "map_items_item_type_check" CHECK ((("item_type")::"text" = ANY ((ARRAY['equipment'::character varying, 'area'::character varying])::"text"[]))),
    CONSTRAINT "map_items_opacity_check" CHECK ((("opacity" >= (0)::numeric) AND ("opacity" <= (1)::numeric)))
);


ALTER TABLE "public"."map_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."map_layers" (
    "id" "text" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "floor_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "z_index" integer DEFAULT 0 NOT NULL,
    "visible" boolean DEFAULT true NOT NULL,
    "locked" boolean DEFAULT false NOT NULL,
    "opacity" real DEFAULT 1.0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."map_layers" OWNER TO "postgres";


COMMENT ON TABLE "public"."map_layers" IS 'Tabla para almacenar las capas de los mapas con su orden z-index';



COMMENT ON COLUMN "public"."map_layers"."id" IS 'ID único de la capa';



COMMENT ON COLUMN "public"."map_layers"."company_id" IS 'ID de la empresa propietaria';



COMMENT ON COLUMN "public"."map_layers"."floor_id" IS 'ID del piso al que pertenece la capa';



COMMENT ON COLUMN "public"."map_layers"."name" IS 'Nombre de la capa';



COMMENT ON COLUMN "public"."map_layers"."z_index" IS 'Orden de apilamiento (mayor valor = más arriba)';



COMMENT ON COLUMN "public"."map_layers"."visible" IS 'Si la capa es visible';



COMMENT ON COLUMN "public"."map_layers"."locked" IS 'Si la capa está bloqueada';



COMMENT ON COLUMN "public"."map_layers"."opacity" IS 'Opacidad de la capa (0.0 a 1.0)';



CREATE TABLE IF NOT EXISTS "public"."map_layers_order" (
    "id" integer NOT NULL,
    "company_id" "uuid" NOT NULL,
    "floor_id" "text" NOT NULL,
    "layer_id" "text" NOT NULL,
    "z_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."map_layers_order" OWNER TO "postgres";


COMMENT ON TABLE "public"."map_layers_order" IS 'Tabla para guardar solo el orden (z_index) de las capas existentes';



COMMENT ON COLUMN "public"."map_layers_order"."company_id" IS 'ID de la empresa propietaria';



COMMENT ON COLUMN "public"."map_layers_order"."floor_id" IS 'ID del piso';



COMMENT ON COLUMN "public"."map_layers_order"."layer_id" IS 'ID de la capa (areas, equipment, etc.)';



COMMENT ON COLUMN "public"."map_layers_order"."z_index" IS 'Orden de apilamiento (mayor valor = más arriba)';



CREATE SEQUENCE IF NOT EXISTS "public"."map_layers_order_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."map_layers_order_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."map_layers_order_id_seq" OWNED BY "public"."map_layers_order"."id";



CREATE TABLE IF NOT EXISTS "public"."perifericos" (
    "id" bigint NOT NULL,
    "tipo" "text",
    "marca" "text",
    "modelo" "text",
    "numero_serie" "text",
    "estado" "text",
    "proveedor_id" bigint,
    "numero_factura" "text",
    "fecha_compra" "date",
    "fecha_vencimiento_garantia" "date",
    "imagen" "text",
    "trazabilidad" "jsonb" DEFAULT '[]'::"jsonb",
    "costo" numeric,
    "company_id" "uuid"
);


ALTER TABLE "public"."perifericos" OWNER TO "postgres";


ALTER TABLE "public"."perifericos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."perifericos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."proveedores" (
    "id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "contacto" "text",
    "telefono" "text",
    "email" "text",
    "company_id" "uuid"
);


ALTER TABLE "public"."proveedores" OWNER TO "postgres";


ALTER TABLE "public"."proveedores" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."proveedores_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."registros" (
    "id" bigint NOT NULL,
    "nombre" "text" NOT NULL,
    "cargo" "text",
    "cedula" "text",
    "fecha_ingreso" "date",
    "equipo_id" bigint,
    "software_ids" bigint[],
    "perifericos_ids" bigint[],
    "trazabilidad" "jsonb" DEFAULT '[]'::"jsonb",
    "company_id" "uuid",
    "departamento" "text",
    "cuentas_creadas" "text",
    "induccion_tic" boolean
);


ALTER TABLE "public"."registros" OWNER TO "postgres";


ALTER TABLE "public"."registros" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."registros_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."software" (
    "id" bigint NOT NULL,
    "nombre" "text",
    "tipo" "text",
    "version" "text",
    "stock" integer,
    "proveedor_id" bigint,
    "numero_factura" "text",
    "fecha_compra" "date",
    "fecha_vencimiento" "date",
    "imagen" "text",
    "trazabilidad" "jsonb" DEFAULT '[]'::"jsonb",
    "costo" numeric,
    "company_id" "uuid"
);


ALTER TABLE "public"."software" OWNER TO "postgres";


ALTER TABLE "public"."software" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."software_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."map_layers_order" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."map_layers_order_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_pkey" PRIMARY KEY ("company_id", "user_id");



ALTER TABLE ONLY "public"."consumibles"
    ADD CONSTRAINT "consumibles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_company_id_numero_serie_key" UNIQUE ("company_id", "numero_serie");



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_logs"
    ADD CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_schedules"
    ADD CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."map_floors"
    ADD CONSTRAINT "map_floors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."map_items"
    ADD CONSTRAINT "map_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."map_layers_order"
    ADD CONSTRAINT "map_layers_order_company_id_floor_id_layer_id_key" UNIQUE ("company_id", "floor_id", "layer_id");



ALTER TABLE ONLY "public"."map_layers_order"
    ADD CONSTRAINT "map_layers_order_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."map_layers"
    ADD CONSTRAINT "map_layers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perifericos"
    ADD CONSTRAINT "perifericos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proveedores"
    ADD CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros"
    ADD CONSTRAINT "registros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."software"
    ADD CONSTRAINT "software_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_equipos_codigo_interno" ON "public"."equipos" USING "btree" ("codigo_interno");



CREATE INDEX "idx_map_floors_company" ON "public"."map_floors" USING "btree" ("company_id");



CREATE INDEX "idx_map_floors_company_id" ON "public"."map_floors" USING "btree" ("company_id");



CREATE INDEX "idx_map_items_company" ON "public"."map_items" USING "btree" ("company_id");



CREATE INDEX "idx_map_items_company_id" ON "public"."map_items" USING "btree" ("company_id");



CREATE INDEX "idx_map_items_equipo_id" ON "public"."map_items" USING "btree" ("equipo_id");



CREATE INDEX "idx_map_items_floor" ON "public"."map_items" USING "btree" ("floor_id");



CREATE INDEX "idx_map_items_floor_id" ON "public"."map_items" USING "btree" ("floor_id");



CREATE INDEX "idx_map_items_type" ON "public"."map_items" USING "btree" ("item_type");



CREATE INDEX "idx_map_layers_company_id" ON "public"."map_layers" USING "btree" ("company_id");



CREATE INDEX "idx_map_layers_floor_id" ON "public"."map_layers" USING "btree" ("floor_id");



CREATE INDEX "idx_map_layers_order_company_floor" ON "public"."map_layers_order" USING "btree" ("company_id", "floor_id");



CREATE INDEX "idx_map_layers_order_z_index" ON "public"."map_layers_order" USING "btree" ("z_index");



CREATE INDEX "idx_map_layers_z_index" ON "public"."map_layers" USING "btree" ("z_index");



CREATE OR REPLACE TRIGGER "trigger_update_map_layers_order_updated_at" BEFORE UPDATE ON "public"."map_layers_order" FOR EACH ROW EXECUTE FUNCTION "public"."update_map_layers_order_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_map_layers_updated_at" BEFORE UPDATE ON "public"."map_layers" FOR EACH ROW EXECUTE FUNCTION "public"."update_map_layers_updated_at"();



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumibles"
    ADD CONSTRAINT "consumibles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consumibles"
    ADD CONSTRAINT "consumibles_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_registro_id_fkey" FOREIGN KEY ("registro_id") REFERENCES "public"."registros"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."maintenance_logs"
    ADD CONSTRAINT "maintenance_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_logs"
    ADD CONSTRAINT "maintenance_logs_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_schedules"
    ADD CONSTRAINT "maintenance_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_schedules"
    ADD CONSTRAINT "maintenance_schedules_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."map_floors"
    ADD CONSTRAINT "map_floors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."map_items"
    ADD CONSTRAINT "map_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."map_items"
    ADD CONSTRAINT "map_items_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."map_items"
    ADD CONSTRAINT "map_items_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "public"."map_floors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."map_layers"
    ADD CONSTRAINT "map_layers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."map_layers_order"
    ADD CONSTRAINT "map_layers_order_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."perifericos"
    ADD CONSTRAINT "perifericos_proveedorid_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros"
    ADD CONSTRAINT "registros_equipoid_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."software"
    ADD CONSTRAINT "software_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE SET NULL;



CREATE POLICY "Allow users to manage their own company consumables" ON "public"."consumibles" USING (("auth"."uid"() IN ( SELECT "company_users"."user_id"
   FROM "public"."company_users"
  WHERE ("company_users"."company_id" = "consumibles"."company_id"))));



CREATE POLICY "Dueño puede ver sus empresas" ON "public"."companies" FOR SELECT USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Los dueños de empresas pueden añadir miembros." ON "public"."company_users" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Los dueños pueden actualizar sus empresas." ON "public"."companies" FOR UPDATE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Los miembros pueden gestionar el software de sus empresas." ON "public"."software" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los miembros pueden gestionar los activos de sus empresas." ON "public"."equipos" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los miembros pueden gestionar los logs de su empresa" ON "public"."maintenance_logs" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los miembros pueden gestionar los periféricos de sus empresas." ON "public"."perifericos" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los miembros pueden gestionar los proveedores de sus empresas." ON "public"."proveedores" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los miembros pueden gestionar los registros de usuario de sus e" ON "public"."registros" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los miembros pueden ver a otros miembros de sus empresas." ON "public"."company_users" FOR SELECT USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los usuarios autenticados pueden crear empresas." ON "public"."companies" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Los usuarios pueden crear empresas." ON "public"."companies" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Los usuarios pueden ver las empresas de las que son miembros." ON "public"."companies" FOR SELECT USING (("id" IN ( SELECT "company_users"."company_id"
   FROM "public"."company_users"
  WHERE ("company_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Miembros gestionan planes de mantenimiento de sus empresas" ON "public"."maintenance_schedules" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies"))) WITH CHECK (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Owners can invite users to their own companies" ON "public"."company_users" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "company_users"."company_id") AND ("companies"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Solo dueño puede ver sus empresas" ON "public"."companies" FOR SELECT USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Users can accept their own pending invitations" ON "public"."company_users" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text"))) WITH CHECK (("status" = 'accepted'::"text"));



CREATE POLICY "Users can decline (delete) their own pending invitations" ON "public"."company_users" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can delete layers from their company" ON "public"."map_layers" FOR DELETE USING (("company_id" IN ( SELECT "company_users"."company_id"
   FROM "public"."company_users"
  WHERE (("company_users"."user_id" = "auth"."uid"()) AND ("company_users"."status" = 'accepted'::"text")))));



CREATE POLICY "Users can insert layers for their company" ON "public"."map_layers" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "company_users"."company_id"
   FROM "public"."company_users"
  WHERE (("company_users"."user_id" = "auth"."uid"()) AND ("company_users"."status" = 'accepted'::"text")))));



CREATE POLICY "Users can manage floors for their company" ON "public"."map_floors" USING (("company_id" IN ( SELECT "company_users"."company_id"
   FROM "public"."company_users"
  WHERE (("company_users"."user_id" = "auth"."uid"()) AND ("company_users"."status" = 'accepted'::"text")))));



CREATE POLICY "Users can manage items for their company" ON "public"."map_items" USING (("company_id" IN ( SELECT "company_users"."company_id"
   FROM "public"."company_users"
  WHERE (("company_users"."user_id" = "auth"."uid"()) AND ("company_users"."status" = 'accepted'::"text")))));



CREATE POLICY "Users can manage layer order for their company" ON "public"."map_layers_order" USING (("company_id" IN ( SELECT "company_users"."company_id"
   FROM "public"."company_users"
  WHERE (("company_users"."user_id" = "auth"."uid"()) AND ("company_users"."status" = 'accepted'::"text")))));



CREATE POLICY "Users can see their own membership status" ON "public"."company_users" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update layers from their company" ON "public"."map_layers" FOR UPDATE USING (("company_id" IN ( SELECT "company_users"."company_id"
   FROM "public"."company_users"
  WHERE (("company_users"."user_id" = "auth"."uid"()) AND ("company_users"."status" = 'accepted'::"text")))));



CREATE POLICY "Users can view companies they are a member of" ON "public"."companies" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."company_users" "cu"
  WHERE (("cu"."company_id" = "companies"."id") AND ("cu"."user_id" = "auth"."uid"()) AND ("cu"."status" = 'accepted'::"text")))));



CREATE POLICY "Users can view layers from their company" ON "public"."map_layers" FOR SELECT USING (("company_id" IN ( SELECT "company_users"."company_id"
   FROM "public"."company_users"
  WHERE (("company_users"."user_id" = "auth"."uid"()) AND ("company_users"."status" = 'accepted'::"text")))));



CREATE POLICY "Usuario logueado puede crear empresa" ON "public"."companies" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Usuario puede agregarse a una empresa" ON "public"."company_users" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Usuario puede ver su pertenencia" ON "public"."company_users" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consumibles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."maintenance_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."map_floors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."map_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."map_layers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."map_layers_order" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."perifericos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proveedores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."registros" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."software" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_company_and_add_owner"("company_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_company_and_add_owner"("company_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_company_and_add_owner"("company_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_test_company"("company_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_test_company"("company_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_test_company"("company_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_assets_with_depreciation"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_assets_with_depreciation"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_assets_with_depreciation"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_combined_trazabilidad"("p_registro_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_combined_trazabilidad"("p_registro_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_combined_trazabilidad"("p_registro_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_company_members"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_company_members"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_company_members"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_companies"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_companies"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_companies"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_paginated_maintenance_logs"("p_company_id" "uuid", "p_page_number" integer, "p_page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_paginated_maintenance_logs"("p_company_id" "uuid", "p_page_number" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_paginated_maintenance_logs"("p_company_id" "uuid", "p_page_number" integer, "p_page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_registros_count"("p_company_id" "uuid", "p_search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_registros_count"("p_company_id" "uuid", "p_search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_registros_count"("p_company_id" "uuid", "p_search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_registros_details"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_registros_details"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_registros_details"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_registros_paginated_and_filtered"("p_company_id" "uuid", "p_search_term" "text", "p_page_number" integer, "p_page_size" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_registros_paginated_and_filtered"("p_company_id" "uuid", "p_search_term" "text", "p_page_number" integer, "p_page_size" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_registros_paginated_and_filtered"("p_company_id" "uuid", "p_search_term" "text", "p_page_number" integer, "p_page_size" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_total_maintenance_logs_count"("p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_maintenance_logs_count"("p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_maintenance_logs_count"("p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_id_by_email"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_map_layers_order_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_map_layers_order_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_map_layers_order_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_map_layers_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_map_layers_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_map_layers_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_network_devices_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_network_devices_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_network_devices_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."company_users" TO "anon";
GRANT ALL ON TABLE "public"."company_users" TO "authenticated";
GRANT ALL ON TABLE "public"."company_users" TO "service_role";



GRANT ALL ON TABLE "public"."consumibles" TO "anon";
GRANT ALL ON TABLE "public"."consumibles" TO "authenticated";
GRANT ALL ON TABLE "public"."consumibles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."consumibles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."consumibles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."consumibles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."equipos" TO "anon";
GRANT ALL ON TABLE "public"."equipos" TO "authenticated";
GRANT ALL ON TABLE "public"."equipos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."equipos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."equipos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."equipos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_logs" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."maintenance_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."maintenance_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."maintenance_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_schedules" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_schedules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."maintenance_schedules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."maintenance_schedules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."maintenance_schedules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."map_floors" TO "anon";
GRANT ALL ON TABLE "public"."map_floors" TO "authenticated";
GRANT ALL ON TABLE "public"."map_floors" TO "service_role";



GRANT ALL ON TABLE "public"."map_items" TO "anon";
GRANT ALL ON TABLE "public"."map_items" TO "authenticated";
GRANT ALL ON TABLE "public"."map_items" TO "service_role";



GRANT ALL ON TABLE "public"."map_layers" TO "anon";
GRANT ALL ON TABLE "public"."map_layers" TO "authenticated";
GRANT ALL ON TABLE "public"."map_layers" TO "service_role";



GRANT ALL ON TABLE "public"."map_layers_order" TO "anon";
GRANT ALL ON TABLE "public"."map_layers_order" TO "authenticated";
GRANT ALL ON TABLE "public"."map_layers_order" TO "service_role";



GRANT ALL ON SEQUENCE "public"."map_layers_order_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."map_layers_order_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."map_layers_order_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."perifericos" TO "anon";
GRANT ALL ON TABLE "public"."perifericos" TO "authenticated";
GRANT ALL ON TABLE "public"."perifericos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."perifericos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."perifericos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."perifericos_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."proveedores" TO "anon";
GRANT ALL ON TABLE "public"."proveedores" TO "authenticated";
GRANT ALL ON TABLE "public"."proveedores" TO "service_role";



GRANT ALL ON SEQUENCE "public"."proveedores_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."proveedores_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."proveedores_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."registros" TO "anon";
GRANT ALL ON TABLE "public"."registros" TO "authenticated";
GRANT ALL ON TABLE "public"."registros" TO "service_role";



GRANT ALL ON SEQUENCE "public"."registros_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."registros_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."registros_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."software" TO "anon";
GRANT ALL ON TABLE "public"."software" TO "authenticated";
GRANT ALL ON TABLE "public"."software" TO "service_role";



GRANT ALL ON SEQUENCE "public"."software_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."software_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."software_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























alter table "public"."map_items" drop constraint "map_items_item_type_check";

alter table "public"."map_items" add constraint "map_items_item_type_check" CHECK (((item_type)::text = ANY ((ARRAY['equipment'::character varying, 'area'::character varying])::text[]))) not valid;

alter table "public"."map_items" validate constraint "map_items_item_type_check";


  create policy "Los usuarios autenticados pueden leer activos"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'activos'::text));



  create policy "Los usuarios autenticados pueden leer evidencias"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'evidencias'::text));



  create policy "Los usuarios autenticados pueden leer facturas"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'facturas'::text));



  create policy "Los usuarios autenticados pueden subir a activos"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'activos'::text));



  create policy "Los usuarios autenticados pueden subir evidencias"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'evidencias'::text));



  create policy "Los usuarios autenticados pueden subir facturas"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'facturas'::text));



