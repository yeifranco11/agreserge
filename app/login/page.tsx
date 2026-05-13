"use client";

import Image from "next/image";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("No se pudo iniciar sesión: " + error.message);
      return;
    }

    alert("Bienvenido a AGRESERGE");
    window.location.href = "/";
  }

  async function handleRegister() {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert("No se pudo registrar: " + error.message);
      return;
    }

    alert("Registro creado. Revisa tu correo si Supabase solicita confirmación.");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,#6699d966,transparent_28%),radial-gradient(circle_at_80%_20%,#f59e0b55,transparent_25%),radial-gradient(circle_at_50%_85%,#ef233c55,transparent_30%)]" />
      <div className="absolute inset-0 bg-black/55" />

      <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="mb-8 inline-flex rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold backdrop-blur">
            Plataforma inteligente en línea
          </div>

          <h1 className="max-w-2xl text-6xl font-black leading-tight tracking-tight">
            Bienvenido a{" "}
            <span className="bg-gradient-to-r from-[#6a9bd8] via-white to-[#f59e0b] bg-clip-text text-transparent">
              AGRESERGE
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
            Sistema integral para agremiados, líderes, revisión documental,
            obligaciones, alertas, expedientes digitales e inteligencia artificial.
          </p>

          <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
            {[
              "Cargue documental",
              "Revisión con IA",
              "Alertas de vencimiento",
              "Informes automáticos",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-semibold backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="rounded-[2rem] border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-full bg-white p-3 shadow-xl">
                <Image
                  src="/logo-agreserge.png"
                  alt="Logo AGRESERGE"
                  width={100}
                  height={100}
                  className="object-contain"
                  priority
                />
              </div>

              <h2 className="text-4xl font-black tracking-tight">AGRESERGE</h2>
              <p className="mt-2 text-sm text-slate-300">
                Intranet inteligente de gestión
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-2xl bg-black/30 p-1">
              <button
                onClick={() => setMode("login")}
                className={`rounded-xl py-3 text-sm font-bold transition ${
                  mode === "login"
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Iniciar sesión
              </button>

              <button
                onClick={() => setMode("register")}
                className={`rounded-xl py-3 text-sm font-bold transition ${
                  mode === "register"
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Registrarse
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  placeholder="usuario@correo.com"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none placeholder:text-slate-400 focus:border-[#6a9bd8]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">
                  Contraseña
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-4 text-white outline-none placeholder:text-slate-400 focus:border-[#f59e0b]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {mode === "login" ? (
                <button
                  onClick={handleLogin}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#6a9bd8] via-[#ef233c] to-[#f59e0b] px-5 py-4 font-black text-white shadow-lg transition hover:scale-[1.01]"
                >
                  Ingresar al sistema
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#f59e0b] via-[#ef233c] to-[#6a9bd8] px-5 py-4 font-black text-white shadow-lg transition hover:scale-[1.01]"
                >
                  Crear cuenta
                </button>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-xs leading-6 text-slate-300">
              Acceso seguro para agremiados, líderes, revisores documentales,
              vinculación y administración.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}