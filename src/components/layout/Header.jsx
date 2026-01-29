// src/components/layout/Header.jsx

import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import Dropdown from "../common/Dropdown";
import { useAppContext } from "../../context/AppContext";
import { BellIcon } from "@heroicons/react/24/outline";

function Header() {
  const { session, companies, activeCompany, selectCompany } = useAppContext();
  const location = useLocation();
  const { pathname } = location;
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [sections, setSections] = useState([]); // agrupadas por fecha/responsable
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ▼▼▼ CORRECCIÓN APLICADA AQUÍ ▼▼▼
  const handleCompanyChange = (e) => {
    selectCompany(e.target.value);
    // Se eliminó la línea "window.location.reload();"
  };

  const gestionRoutes = ["/hojas-de-vida", "/inventario", "/mantenimiento", "/compras", "/proveedores"];

  useEffect(() => {
    const fetchNotifs = async () => {
      if (!activeCompany) {
        setNotifications([]);
        setSections([]);
        setUnreadCount(0);
        return;
      }
      const today = new Date();
      const in7 = new Date();
      in7.setDate(in7.getDate() + 7);
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("id, title, next_date, active, responsible")
        .eq("company_id", activeCompany.id)
        .eq("active", true)
        .order("next_date", { ascending: true });
      if (error) return;
      const items = (data || []).map((s) => ({
        id: s.id,
        title: s.title,
        next_date: s.next_date,
        responsible: s.responsible || "Sin responsable",
        overdue: new Date(s.next_date) < today,
        soon: (() => {
          const d = new Date(s.next_date);
          return d >= today && d <= in7;
        })(),
      }));
      const filtered = items.filter((i) => i.overdue || i.soon);
      setNotifications(filtered);

      // Agrupar: sección "Vencidos" y secciones por fecha para próximos
      const overdueItems = filtered.filter((i) => i.overdue);
      const soonItems = filtered.filter((i) => !i.overdue);

      const sectionsBuilt = [];
      if (overdueItems.length > 0) {
        // agrupar vencidos por responsable
        const byResp = overdueItems.reduce((acc, it) => {
          (acc[it.responsible] = acc[it.responsible] || []).push(it);
          return acc;
        }, {});
        sectionsBuilt.push({
          header: "Vencidos",
          groups: Object.entries(byResp).map(([resp, items]) => ({
            subheader: resp,
            items,
          })),
        });
      }
      // agrupar próximos por fecha (DD/MM/AAAA) y dentro por responsable
      const byDate = soonItems.reduce((acc, it) => {
        const label = new Date(it.next_date).toLocaleDateString();
        (acc[label] = acc[label] || []).push(it);
        return acc;
      }, {});
      Object.entries(byDate)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .forEach(([dateLabel, arr]) => {
          const byResp2 = arr.reduce((acc, it) => {
            (acc[it.responsible] = acc[it.responsible] || []).push(it);
            return acc;
          }, {});
          sectionsBuilt.push({
            header: `Próx. ${dateLabel}`,
            groups: Object.entries(byResp2).map(([resp, items]) => ({
              subheader: resp,
              items,
            })),
          });
        });
      setSections(sectionsBuilt);
      setUnreadCount(notifOpen ? 0 : filtered.length);
    };
    fetchNotifs();
  }, [activeCompany]);

  // Al abrir el dropdown, limpiar contador no leído
  useEffect(() => {
    if (notifOpen) setUnreadCount(0);
  }, [notifOpen]);

  // Suscripción en tiempo real a cambios en maintenance_schedules
  useEffect(() => {
    if (!activeCompany) return;
    const channel = supabase
      .channel("maintenance_schedules_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "maintenance_schedules",
          filter: `company_id=eq.${activeCompany.id}`,
        },
        () => {
          // refetch al cambiar algo
          (async () => {
            const today = new Date();
            const in7 = new Date();
            in7.setDate(in7.getDate() + 7);
            const { data } = await supabase
              .from("maintenance_schedules")
              .select("id, title, next_date, active, responsible")
              .eq("company_id", activeCompany.id)
              .eq("active", true)
              .order("next_date", { ascending: true });
            const items = (data || []).map((s) => ({
              id: s.id,
              title: s.title,
              next_date: s.next_date,
              responsible: s.responsible || "Sin responsable",
              overdue: new Date(s.next_date) < today,
              soon: (() => {
                const d = new Date(s.next_date);
                return d >= today && d <= in7;
              })(),
            }));
            const filtered = items.filter((i) => i.overdue || i.soon);
            setNotifications(filtered);
            // reconstruir secciones como arriba
            const overdueItems = filtered.filter((i) => i.overdue);
            const soonItems = filtered.filter((i) => !i.overdue);
            const sectionsBuilt = [];
            if (overdueItems.length > 0) {
              const byResp = overdueItems.reduce((acc, it) => {
                (acc[it.responsible] = acc[it.responsible] || []).push(it);
                return acc;
              }, {});
              sectionsBuilt.push({
                header: "Vencidos",
                groups: Object.entries(byResp).map(([resp, items]) => ({ subheader: resp, items })),
              });
            }
            const byDate = soonItems.reduce((acc, it) => {
              const label = new Date(it.next_date).toLocaleDateString();
              (acc[label] = acc[label] || []).push(it);
              return acc;
            }, {});
            Object.entries(byDate)
              .sort((a, b) => new Date(a[0]) - new Date(b[0]))
              .forEach(([dateLabel, arr]) => {
                const byResp2 = arr.reduce((acc, it) => {
                  (acc[it.responsible] = acc[it.responsible] || []).push(it);
                  return acc;
                }, {});
                sectionsBuilt.push({
                  header: `Próx. ${dateLabel}`,
                  groups: Object.entries(byResp2).map(([resp, items]) => ({ subheader: resp, items })),
                });
              });
            setSections(sectionsBuilt);
            setUnreadCount(notifOpen ? 0 : filtered.length);
          })();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCompany]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <header className="bg-white shadow-md sticky top-0 z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900 flex-shrink-0">
              Netsuit IT
            </h1>
            {activeCompany && (
              <select
                onChange={handleCompanyChange}
                value={activeCompany ? activeCompany.id : ""} // Aseguramos un valor controlado
                className="hidden sm:block bg-gray-50 border-gray-300 text-sm rounded-lg w-full max-w-xs p-2"
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <nav className="hidden md:flex items-center space-x-1 text-gray-600 font-medium text-sm">
            <Link
              to="/"
              className={`nav-link ${pathname === "/" ? "active" : ""}`}
            >
              Dashboard
            </Link>

            <Dropdown
              title="Gestión"
              isActive={gestionRoutes.some((route) =>
                pathname.startsWith(route)
              )}
            >
              <Link
                to="/hojas-de-vida"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Hojas de Vida
              </Link>
              <Link
                to="/inventario"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Inventario
              </Link>
              <Link
                to="/mantenimiento"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Mantenimiento
              </Link>
              <Link
                to="/compras"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Compras
              </Link>
              <Link
                to="/proveedores"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Proveedores
              </Link>
            </Dropdown>


            <Link
              to="/reportes"
              className={`nav-link ${pathname === "/reportes" ? "active" : ""}`}
            >
              Reportes
            </Link>

            <Link
              to="/mapas"
              className={`nav-link ${pathname === "/mapas" ? "active" : ""}`}
            >
              Mapas
            </Link>

            <Link
              to="/empresas"
              className={`nav-link ${pathname === "/empresas" ? "active" : ""}`}
            >
              Empresas
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 rounded-full hover:bg-gray-100"
                title="Notificaciones"
              >
                <BellIcon className="w-6 h-6 text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-600 text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                  <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800">Notificaciones</span>
                    <Link
                      to="/mantenimiento"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Ver todo
                    </Link>
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {sections.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">Sin notificaciones</div>
                    ) : (
                      sections.map((sec, i) => (
                        <div key={i} className="border-b border-gray-100 last:border-b-0">
                          <div className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-50">{sec.header}</div>
                          {sec.groups.map((grp, j) => (
                            <div key={j} className="px-4 py-2">
                              <div className="text-xs text-gray-500 mb-1">{grp.subheader}</div>
                              {grp.items.map((n) => (
                                <div key={n.id} className="py-1">
                                  <div className="text-sm font-medium text-gray-900">{n.title}</div>
                                  <div className="text-xs text-gray-600">{new Date(n.next_date).toLocaleDateString()}</div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              {session?.user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="py-2 px-3 text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </header >
  );
}

export default Header;
