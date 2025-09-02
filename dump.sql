

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


CREATE OR REPLACE FUNCTION "public"."get_company_members"("p_company_id" "uuid") RETURNS TABLE("email" "text", "role" "text", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Comprobación de seguridad: ¿El usuario actual es miembro de la empresa?
  IF NOT EXISTS (
    SELECT 1
    FROM public.company_users cu
    WHERE cu.company_id = p_company_id
      AND cu.user_id = auth.uid()
      AND cu.status = 'accepted'
  ) THEN
    RETURN;
  END IF;

  -- Consulta principal con la corrección
  RETURN QUERY
  SELECT
    u.email::text,  -- <--- ¡ESTA ES LA CORRECCIÓN! Convertimos el email a tipo 'text'.
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


CREATE OR REPLACE FUNCTION "public"."get_paginated_maintenance_logs"("p_company_id" "uuid", "p_page_number" integer, "p_page_size" integer) RETURNS TABLE("fecha" timestamp with time zone, "equipo_info" "text", "detalle" "text", "tecnico" "text", "log_id" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        (log->>'fecha')::TIMESTAMPTZ AS fecha,
        e.marca || ' ' || e.modelo AS equipo_info,
        log->>'detalle' AS detalle,
        log->>'tecnico' AS tecnico,
        e.id::text || '-' || (log->>'fecha') AS log_id
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


CREATE TABLE IF NOT EXISTS "public"."company_users" (
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL
);


ALTER TABLE "public"."company_users" OWNER TO "postgres";


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
    "registro_id" bigint
);


ALTER TABLE "public"."equipos" OWNER TO "postgres";


ALTER TABLE "public"."equipos" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."equipos_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



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



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_pkey" PRIMARY KEY ("company_id", "user_id");



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_numeroserie_key" UNIQUE ("numero_serie");



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."perifericos"
    ADD CONSTRAINT "perifericos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proveedores"
    ADD CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."registros"
    ADD CONSTRAINT "registros_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."software"
    ADD CONSTRAINT "software_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_users"
    ADD CONSTRAINT "company_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipos"
    ADD CONSTRAINT "equipos_registro_id_fkey" FOREIGN KEY ("registro_id") REFERENCES "public"."registros"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."perifericos"
    ADD CONSTRAINT "perifericos_proveedorid_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."registros"
    ADD CONSTRAINT "registros_equipoid_fkey" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."software"
    ADD CONSTRAINT "software_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE SET NULL;



CREATE POLICY "Dueño puede ver sus empresas" ON "public"."companies" FOR SELECT USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Los dueños de empresas pueden añadir miembros." ON "public"."company_users" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "companies"."id"
   FROM "public"."companies"
  WHERE ("companies"."owner_id" = "auth"."uid"()))));



CREATE POLICY "Los dueños pueden actualizar sus empresas." ON "public"."companies" FOR UPDATE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Los miembros pueden gestionar el software de sus empresas." ON "public"."software" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los miembros pueden gestionar los activos de sus empresas." ON "public"."equipos" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los miembros pueden gestionar los periféricos de sus empresas." ON "public"."perifericos" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los miembros pueden gestionar los proveedores de sus empresas." ON "public"."proveedores" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los miembros pueden gestionar los registros de usuario de sus e" ON "public"."registros" USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los miembros pueden ver a otros miembros de sus empresas." ON "public"."company_users" FOR SELECT USING (("company_id" IN ( SELECT "public"."get_my_companies"() AS "get_my_companies")));



CREATE POLICY "Los usuarios autenticados pueden crear empresas." ON "public"."companies" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Los usuarios pueden crear empresas." ON "public"."companies" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Los usuarios pueden ver las empresas de las que son miembros." ON "public"."companies" FOR SELECT USING (("id" IN ( SELECT "company_users"."company_id"
   FROM "public"."company_users"
  WHERE ("company_users"."user_id" = "auth"."uid"()))));



CREATE POLICY "Owners can invite users to their own companies" ON "public"."company_users" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."companies"
  WHERE (("companies"."id" = "company_users"."company_id") AND ("companies"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Solo dueño puede ver sus empresas" ON "public"."companies" FOR SELECT USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Users can accept their own pending invitations" ON "public"."company_users" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text"))) WITH CHECK (("status" = 'accepted'::"text"));



CREATE POLICY "Users can decline (delete) their own pending invitations" ON "public"."company_users" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Users can see their own membership status" ON "public"."company_users" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view companies they are a member of" ON "public"."companies" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."company_users" "cu"
  WHERE (("cu"."company_id" = "companies"."id") AND ("cu"."user_id" = "auth"."uid"()) AND ("cu"."status" = 'accepted'::"text")))));



CREATE POLICY "Usuario logueado puede crear empresa" ON "public"."companies" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Usuario puede agregarse a una empresa" ON "public"."company_users" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Usuario puede ver su pertenencia" ON "public"."company_users" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipos" ENABLE ROW LEVEL SECURITY;


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


















GRANT ALL ON TABLE "public"."company_users" TO "anon";
GRANT ALL ON TABLE "public"."company_users" TO "authenticated";
GRANT ALL ON TABLE "public"."company_users" TO "service_role";



GRANT ALL ON TABLE "public"."equipos" TO "anon";
GRANT ALL ON TABLE "public"."equipos" TO "authenticated";
GRANT ALL ON TABLE "public"."equipos" TO "service_role";



GRANT ALL ON SEQUENCE "public"."equipos_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."equipos_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."equipos_id_seq" TO "service_role";



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






























RESET ALL;
