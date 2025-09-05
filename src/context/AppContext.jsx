// src/context/AppContext.jsx

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { supabase } from "../supabaseClient";
import toast from "react-hot-toast"; // Importar react-hot-toast

const AppContext = createContext();

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- LÓGICA DE NOTIFICACIONES (con react-hot-toast) ---
  const showNotification = useCallback((message, type = "info") => {
    switch (type) {
      case "success":
        toast.success(message);
        break;
      case "error":
        toast.error(message);
        break;
      case "info":
      default:
        toast(message, {
          icon: "ℹ️",
        });
        break;
    }
  }, []);

  // --- LÓGICA DE MODAL DE CONFIRMACIÓN ---
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showConfirm = useCallback((title, message, onConfirm) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      // ▼▼▼ AQUÍ ESTÁ LA CORRECCIÓN ▼▼▼
      // Guardamos la función directamente, sin envolverla en otra.
      onConfirm: onConfirm,
    });
  }, []);

  const hideConfirm = () => {
    setConfirmState({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: () => {},
    });
  };

  // --- LÓGICA DE DATOS (sin cambios) ---
  const fetchUserCompanies = useCallback(async () => {
    if (!session) return;

    const { data, error } = await supabase
      .from("company_users")
      .select("status, role, companies(*)")
      .eq("user_id", session.user.id);

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
      const lastCompany = accepted.find((c) => String(c.id) === lastCompanyId);

      if (lastCompany) {
        setActiveCompany(lastCompany);
      } else if (accepted.length > 0) {
        setActiveCompany(accepted[0]);
        localStorage.setItem("activeCompanyId", accepted[0].id);
      } else {
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

  // Objeto de valor que se pasa a los componentes hijos
  const value = {
    session,
    companies,
    invitations,
    activeCompany,
    loading,
    selectCompany,
    refreshCompanies: fetchUserCompanies,
    showNotification,
    confirmState,
    showConfirm,
    hideConfirm,
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
