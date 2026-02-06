// src/supabaseClient.js

import { createClient } from "@supabase/supabase-js";

// Obtenemos las variables de entorno que crearemos en el siguiente paso
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Creamos y exportamos el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        enabled: false
    },
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
    }
});
