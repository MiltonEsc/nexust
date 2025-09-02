// src/pages/AuthPage.jsx

import React, { useState } from "react";
import { supabase } from "../supabaseClient";

function AuthPage() {
  // Estado para alternar entre login y registro
  const [showRegister, setShowRegister] = useState(false);
  // Estado para mensajes de error
  const [errorMsg, setErrorMsg] = useState("");
  // Estado para el feedback de carga (ej. en botones)
  const [loading, setLoading] = useState(false);

  // Estados para controlar los inputs de cada formulario
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
  });

  // Manejadores para actualizar el estado de los inputs
  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRegisterChange = (e) => {
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  };

  // Manejador para el envío del formulario de Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg("");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });
      if (error) throw error;
      console.log("Inicio de sesión exitoso:", data);
      // En la próxima lección haremos que esto redirija al dashboard.
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Manejador para el envío del formulario de Registro
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg("");
      const { data, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            username: registerData.username,
          },
        },
      });
      if (error) throw error;
      alert("¡Registro exitoso! Revisa tu correo para confirmar la cuenta.");
      // Regresamos al login después de un registro exitoso
      setShowRegister(false);
    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };
  // Manejador para el inicio de sesión con Google
  const handleGoogleLogin = async () => {
    try {
      setErrorMsg("");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) throw error;
    } catch (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-200">
      {/* Contenedor del Login */}
      <div className={`w-full max-w-md ${showRegister ? "hidden" : "block"}`}>
        <div className="space-y-6 rounded-xl bg-white p-8 shadow-lg">
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Iniciar Sesión
          </h1>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                value={loginData.email}
                onChange={handleLoginChange}
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="text-sm font-medium text-gray-700"
              >
                Contraseña
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                value={loginData.password}
                onChange={handleLoginChange}
              />
            </div>
            {errorMsg && (
              <p className="text-center text-sm text-red-600">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-indigo-600 py-2 px-4 font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
          <div class="relative flex py-3 items-center">
            <div class="flex-grow border-t border-gray-300"></div>
            <span class="flex-shrink mx-4 text-gray-500 text-sm">O</span>
            <div class="flex-grow border-t border-gray-300"></div>
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin} // Le asignamos su propia función
            className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white py-2 px-4 font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg
              className="mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
            >
              {/* ... todo el contenido del SVG de Google ... */}
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.519-3.487-11.181-8.264l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303c-.792 2.243-2.61 4.451-4.986 5.626l6.19 5.238C42.612 34.627 44 29.692 44 24c0-1.341-.138-2.65-.389-3.917z"
              />
            </svg>
            <span>Continuar con Google</span>
          </button>
          <p className="text-center text-sm text-gray-600">
            ¿No tienes cuenta?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowRegister(true);
                setErrorMsg("");
              }}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Regístrate
            </a>
          </p>
        </div>
      </div>

      {/* Contenedor del Registro */}
      <div className={`w-full max-w-md ${!showRegister ? "hidden" : "block"}`}>
        <div className="space-y-6 rounded-xl bg-white p-8 shadow-lg">
          <h1 className="text-center text-3xl font-bold text-gray-900">
            Crear Cuenta
          </h1>
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="register-username"
                className="text-sm font-medium text-gray-700"
              >
                Nombre de Usuario
              </label>
              <input
                id="register-username"
                name="username"
                type="text"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                value={registerData.username}
                onChange={handleRegisterChange}
              />
            </div>
            <div>
              <label
                htmlFor="register-email"
                className="text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                value={registerData.email}
                onChange={handleRegisterChange}
              />
            </div>
            <div>
              <label
                htmlFor="register-password"
                className="text-sm font-medium text-gray-700"
              >
                Contraseña
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                required
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                value={registerData.password}
                onChange={handleRegisterChange}
              />
            </div>
            {errorMsg && (
              <p className="text-center text-sm text-red-600">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-indigo-600 py-2 px-4 font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
            >
              {loading ? "Registrando..." : "Registrarse"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowRegister(false);
                setErrorMsg("");
              }}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Inicia sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
