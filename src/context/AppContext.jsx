// src/context/AppContext.jsx

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { supabase } from "../supabaseClient";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserCompanies = useCallback(async () => {
    if (!session) return;

    // ▼▼▼ CONSULTA CORREGIDA ▼▼▼
    // Ahora filtramos explícitamente por el user_id del usuario actual.
    // Esto asegura que solo veamos las invitaciones dirigidas a nosotros.
    const { data, error } = await supabase
      .from("company_users")
      .select("status, role, companies(*)")
      .eq("user_id", session.user.id); // <-- LA LÍNEA CLAVE

    if (data) {
      const allCompanies = data.map((item) => ({
        ...item.companies,
        role: item.role,
        status: item.status,
      }));
      const accepted = allCompanies.filter((c) => c.status === "accepted");
      const pending = allCompanies.filter((c) => c.status === "pending");

      setCompanies(accepted);
      setInvitations(pending);

      const lastCompanyId = localStorage.getItem("activeCompanyId");
      // Buscamos la compañía activa solo entre las aceptadas
      const lastCompany = accepted.find((c) => String(c.id) === lastCompanyId);

      if (lastCompany) {
        setActiveCompany(lastCompany);
      } else if (accepted.length > 0) {
        setActiveCompany(accepted[0]);
        localStorage.setItem("activeCompanyId", accepted[0].id);
      } else {
        // Si no hay compañías aceptadas, nos aseguramos de que no haya una activa.
        setActiveCompany(null);
        localStorage.removeItem("activeCompanyId");
      }
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      fetchUserCompanies();
    }
  }, [session, fetchUserCompanies]);

  const selectCompany = (companyId) => {
    const company = companies.find((c) => String(c.id) === String(companyId));
    if (company) {
      setActiveCompany(company);
      localStorage.setItem("activeCompanyId", company.id);
    }
  };

  const value = {
    session,
    companies,
    invitations,
    activeCompany,
    loading,
    selectCompany,
    refreshCompanies: fetchUserCompanies,
  };

  return (
    <AppContext.Provider value={value}>
      {!loading && children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
