// src/pages/ResetPasswordPage.jsx

import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const navigate = useNavigate();

    const handleResetSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setErrorMsg("Las contraseñas no coinciden.");
            return;
        }

        if (password.length < 6) {
            setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        try {
            setLoading(true);
            setErrorMsg("");

            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            toast.success("¡Contraseña actualizada con éxito!");
            navigate("/login");
        } catch (error) {
            setErrorMsg(error.message);
            toast.error("Error al actualizar la contraseña.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-200">
            <div className="w-full max-w-md">
                <div className="space-y-6 rounded-xl bg-white p-8 shadow-lg">
                    <h1 className="text-center text-3xl font-bold text-gray-900">
                        Nueva Contraseña
                    </h1>
                    <p className="text-center text-sm text-gray-600">
                        Ingresa tu nueva contraseña a continuación.
                    </p>

                    <form onSubmit={handleResetSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="new-password"
                                className="text-sm font-medium text-gray-700"
                            >
                                Nueva Contraseña
                            </label>
                            <input
                                id="new-password"
                                name="password"
                                type="password"
                                required
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="confirm-password"
                                className="text-sm font-medium text-gray-700"
                            >
                                Confirmar Contraseña
                            </label>
                            <input
                                id="confirm-password"
                                name="confirmPassword"
                                type="password"
                                required
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        {errorMsg && (
                            <p className="text-center text-sm text-red-600 font-medium">{errorMsg}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-md bg-indigo-600 py-2 px-4 font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                        >
                            {loading ? "Actualizando..." : "Restablecer Contraseña"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-600">
                        ¿Recordaste tu contraseña?{" "}
                        <button
                            onClick={() => navigate("/login")}
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            Inicia sesión
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordPage;
