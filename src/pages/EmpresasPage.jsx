// src/pages/EmpresasPage.jsx

import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAppContext } from "../context/AppContext";
import Modal from "../components/common/Modal";
import CompanyForm from "../components/forms/CompanyForm";
import DeleteCompanyModal from "../components/modals/DeleteCompanyModal";

// --- Componente de Formulario para Invitar ---
const InviteForm = ({ company, onSuccess }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: { company_id: company.id, email },
    });

    setLoading(false);

    if (error) {
      const errorMessage = error.context?.json?.error || error.message;
      setError(errorMessage);
    } else {
      setMessage(`Invitación enviada con éxito a ${email}`);
      setEmail("");
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>
          Email del Usuario a Invitar a <strong>{company.name}</strong>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="input-style"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}
      <div className="text-right">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Enviando..." : "Enviar Invitación"}
        </button>
      </div>
    </form>
  );
};

// --- Componente Principal de la Página ---
function EmpresasPage() {
  const { companies, invitations, loading, refreshCompanies, session } =
    useAppContext();
  const [members, setMembers] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companyToInvite, setCompanyToInvite] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);

  useEffect(() => {
    if (companies.length > 0) {
      companies.forEach((company) => {
        supabase
          .rpc("get_company_members", { p_company_id: company.id })
          .then(({ data, error }) => {
            if (error) {
              console.error(
                `Error fetching members for company ${company.id}:`,
                error
              );
              return;
            }
            if (data) setMembers((prev) => ({ ...prev, [company.id]: data }));
          });
      });
    }
  }, [companies]);

  const handleAcceptInvite = async (companyId) => {
    if (!session) return;
    const { error } = await supabase
      .from("company_users")
      .update({ status: "accepted" })
      .eq("company_id", companyId)
      .eq("user_id", session.user.id);
    if (error) alert(error.message);
    else refreshCompanies();
  };

  const handleDeclineInvite = async (companyId) => {
    if (!session) return;
    if (window.confirm("¿Seguro que quieres rechazar esta invitación?")) {
      const { error } = await supabase
        .from("company_users")
        .delete()
        .eq("company_id", companyId)
        .eq("user_id", session.user.id);
      if (error) alert(error.message);
      else refreshCompanies();
    }
  };

  if (loading) return <p className="p-4 text-center">Cargando...</p>;

  return (
    <div className="p-6 sm:p-8 bg-white rounded-xl shadow-lg max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestionar Empresas</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          Crear Nueva Empresa
        </button>
      </div>

      {invitations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Invitaciones Pendientes</h2>
          {invitations.map((invite) => (
            <div
              key={invite.id}
              className="p-4 border rounded-lg flex justify-between items-center bg-yellow-50"
            >
              <p>
                Has sido invitado a unirte a <strong>{invite.name}</strong>.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptInvite(invite.id)}
                  className="btn-success text-sm"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => handleDeclineInvite(invite.id)}
                  className="btn-danger text-sm"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Mis Empresas</h2>
        {companies.length > 0 ? (
          companies.map((company) => (
            <div key={company.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {company.name}
                  {company.owner_id === session?.user?.id && (
                    <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Propietario
                    </span>
                  )}
                </h3>
                {company.owner_id === session?.user?.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCompanyToInvite(company)}
                      className="btn-success text-sm"
                    >
                      Invitar
                    </button>
                    <button
                      onClick={() => setCompanyToDelete(company)}
                      className="btn-danger text-sm"
                    >
                      Eliminar Empresa
                    </button>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-sm">Miembros:</h4>
                <ul className="text-sm list-disc list-inside pl-2">
                  {(members[company.id] || []).map((member) => (
                    <li key={member.email}>
                      {member.email} -{" "}
                      <span className="text-gray-500 capitalize">
                        {member.role}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        ) : (
          <p>No perteneces a ninguna empresa activa.</p>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Crear Nueva Empresa"
      >
        <CompanyForm
          onSuccess={() => {
            setShowCreateModal(false);
            refreshCompanies();
          }}
        />
      </Modal>

      <Modal
        isOpen={!!companyToInvite}
        onClose={() => setCompanyToInvite(null)}
        title="Invitar Usuario"
      >
        {companyToInvite && (
          <InviteForm
            company={companyToInvite}
            onSuccess={() => setCompanyToInvite(null)}
          />
        )}
      </Modal>

      <DeleteCompanyModal
        company={companyToDelete}
        onClose={() => setCompanyToDelete(null)}
        onSuccess={() => {
          setCompanyToDelete(null);
          refreshCompanies();
        }}
      />
    </div>
  );
}

export default EmpresasPage;
