"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FilePlus2,
  FileText,
  FolderKanban,
  KeyRound,
  Link as LinkIcon,
  Lock,
  LogOut,
  Mail,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Upload,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import {
  askAgrebot,
  changeOwnPassword,
  createDigitalRequest,
  decideDigitalRequest,
  deleteDocument,
  lookupPayroll,
  openRemoteDrivePeriod,
  remoteLogin,
  remoteLogout,
  reviewAffiliateDocuments,
  saveRemoteDB,
  uploadDocument,
} from "../lib/agreserge-client";
import { reportAnnexLabel } from "../lib/hospital-report-config";
import { driveTemplate } from "../lib/drive-templates";
import { NominaComprobantes, SolicitudesFirmas } from "./components/operations";
import {
  documentRequirements,
  healthcareCourseDetails,
} from "../lib/document-requirements";
import {
  isSocioProfileComplete,
  TechnicalProfiles,
} from "./components/technical-profiles";

type TipoPersonal = "Asistencial" | "Administrativo";
type Rol =
  | "Agremiado"
  | "Líder de Proceso"
  | "Líder Institucional"
  | "Coordinadora"
  | "Talento Humano"
  | "Coordinación Administrativa"
  | "Coordinación Asistencial"
  | "Coordinador de Sede"
  | "Tesorería"
  | "Coordinación General"
  | "Administrador de Sistemas"
  | "Coordinación AGRESERGE"
  | "Coordinador de Proceso AGRESERGE"
  | "Coordinador General"
  | "Coordinadora Administrativa y Financiera"
  | "Experiencia al Agremiado"
  | "Asesora de Calidad"
  | "Director Ejecutivo"
  | "Seguridad y Salud en el Trabajo"
  | "Gerente";
type EstadoDoc =
  "Pendiente" | "Cargado" | "Aprobado" | "Rechazado" | "Devuelto";
type Usuario = {
  id: string;
  nombre: string;
  usuario?: string;
  correo: string;
  clave: string;
  rol: Rol;
  tipo?: TipoPersonal;
  entidadId?: string;
  areaId?: string;
  liderId?: string;
  activo: boolean;
  cargo?: string;
  telefono?: string;
};
type Entidad = {
  id: string;
  nombre: string;
  nit: string;
  ciudad: string;
  direccion: string;
  contrato?: ArchivoLocal;
  fechaContrato?: string;
};
type Area = {
  id: string;
  nombre: string;
  entidadId: string;
  tipo: TipoPersonal;
  liderId?: string;
};
type ArchivoLocal = {
  nombre: string;
  tipo: string;
  tamano: number;
  dataUrl: string;
  fecha: string;
};

async function readJson(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); }
  catch {
    throw new Error(response.status === 413
      ? "El archivo es demasiado grande para el canal de carga."
      : `El servidor no pudo procesar la solicitud (${response.status}).`);
  }
}

async function uploadReportFile(id: string, file: File) {
  const metadata = { id, fileName: file.name, fileType: file.type || "application/octet-stream", fileSize: file.size };
  let prepared: any;
  let storageResponse: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prepareResponse = await fetch("/api/agreserge-reports/upload", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "prepare", ...metadata }),
    });
    prepared = await readJson(prepareResponse);
    if (!prepareResponse.ok) throw new Error(prepared.error || "No se pudo preparar la carga.");
    storageResponse = await fetch(prepared.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": metadata.fileType, "x-upsert": "true" },
      body: file,
    });
    if (storageResponse.ok) break;
    const detail = await storageResponse.clone().text().catch(() => "");
    if (!detail.includes("JWT issued at future") || attempt === 2) break;
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  if (!storageResponse) throw new Error("No se pudo iniciar la carga.");
  if (!storageResponse.ok) {
    const detail = await storageResponse.text().catch(() => "");
    throw new Error(detail.includes("JWT issued at future")
      ? "El reloj de seguridad se desincronizó. Intente nuevamente en unos segundos."
      : `No se pudo almacenar el archivo (${storageResponse.status}).`);
  }
  const finalizeResponse = await fetch("/api/agreserge-reports/upload", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "finalize", path: prepared.path, ...metadata }),
  });
  const finalized = await readJson(finalizeResponse);
  if (!finalizeResponse.ok) throw new Error(finalized.error || "No se pudo copiar el archivo a Drive.");
  return finalized;
}
type Documento = {
  id: string;
  nombre: string;
  categoria: string;
  archivo?: ArchivoLocal;
  fechaCarga?: string;
  estado: EstadoDoc;
  observacion?: string;
  vencimiento?: string;
  agremiadoId: string;
};
type Permisos = Record<string, string[]>;
type Asignacion = {
  id: string;
  anexo: number;
  titulo: string;
  tipo: "Administrativo" | "Asistencial";
  responsableId: string;
  coordinadorId?: string;
  mes: string;
  anio: string;
  plantillaGoogle: string;
  hojaGoogle?: string;
  copiaGoogle: string;
  fechaLimite: string;
  fechaCarga?: string;
  archivo?: ArchivoLocal;
  estado:
    | "Asignado"
    | "En desarrollo"
    | "Cargado"
    | "Extemporáneo"
    | "Aprobado"
    | "Devuelto";
  observacion?: string;
  notificarEstadistica: boolean;
};
type Tramite = {
  id: string;
  agremiadoId: string;
  tipo:
    | "Carta laboral"
    | "Comprobante de nómina"
    | "Comprobante de pago"
    | "Certificado de afiliación"
    | "Paz y salvo"
    | "Otro trámite";
  periodo: string;
  estado: "Solicitado" | "Generado" | "Entregado";
  fuenteGoogle: string;
  archivo?: ArchivoLocal;
  generado: string;
  observacion?: string;
};
type DB = {
  usuarios: Usuario[];
  perfiles?: Record<string, any>;
  entidades: Entidad[];
  areas: Area[];
  documentos: Record<string, Documento[]>;
  permisos: Permisos;
  asignacionesBase: Asignacion[];
  asignacionesMensuales: Asignacion[];
  tramites?: Tramite[];
  auditoria: string[];
};

const uid = () => Math.random().toString(36).slice(2, 10);
const hoy = () => new Date().toISOString().slice(0, 10);
const roleLabel = (rol: string) =>
  rol === "Agremiado"
    ? "Afiliado partícipe"
    : rol === "Administrador de Sistemas"
      ? "Administrador del sistema"
      : rol;
const roles: Rol[] = [
  "Agremiado",
  "Líder de Proceso",
  "Coordinadora",
  "Talento Humano",
  "Coordinación Administrativa",
  "Coordinación Asistencial",
  "Coordinador de Sede",
  "Tesorería",
  "Coordinación General",
  "Asesora de Calidad",
  "Experiencia al Agremiado",
  "Director Ejecutivo",
  "Seguridad y Salud en el Trabajo",
  "Administrador de Sistemas",
];
const modulos = [
  "Inicio",
  "Dashboard gerente",
  "Parámetros institucionales",
  "Ficha técnica",
  "Cargue documental",
  "Revisión documental",
  "Mis agremiados",
  "Informes de actividades",
  "Asignación mensual",
  "Nómina y comprobantes",
  "Solicitudes y firmas",
  "Trámites administrativos",
  "Permisos por perfil",
  "Usuarios y claves",
  "AGREBOT",
  "Auditoría",
];
const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const anexos = [
  [
    1,
    "Informe de actividades realizadas en procesos administrativos",
    "Administrativo",
  ],
  [2, "Informe de actividades administrativas AGRESERGE", "Administrativo"],
  [
    3,
    "Informe de actividades realizadas en procesos asistenciales",
    "Asistencial",
  ],
  [
    4,
    "Informe de actividades asistenciales y pagos de seguridad social",
    "Asistencial",
  ],
  [
    5,
    "Base de datos del personal y certificaciones de habilitación",
    "Administrativo",
  ],
  [6, "Base de datos del personal con convenio y vigencia", "Administrativo"],
  [7, "Informe mensual de vacaciones otorgadas", "Administrativo"],
  [8, "Informe mensual de permisos laborales concedidos", "Administrativo"],
  [9, "Informe mensual de incapacidades laborales", "Administrativo"],
  [10, "Informe mensual de afiliaciones al SGSSS", "Administrativo"],
  [11, "Plan de bienestar laboral e informe mensual", "Administrativo"],
  [12, "Relación de agremiados vinculados durante el mes", "Administrativo"],
  [13, "Registro de inducción específica al cargo", "Administrativo"],
  [
    14,
    "Resultados de entrevista y evaluación de conocimiento",
    "Administrativo",
  ],
  [15, "Plan de capacitación e informe mensual", "Administrativo"],
  [16, "Póliza de responsabilidad civil extracontractual", "Asistencial"],
  [17, "Base de datos de pólizas de responsabilidad civil", "Asistencial"],
  [18, "Manual de actividades", "Administrativo"],
  [19, "Certificación de no cesión del contrato", "Administrativo"],
  [20, "Planilla de pago de seguridad social", "Administrativo"],
  [21, "Plan SST e informe de ejecución mensual", "Administrativo"],
  [22, "Formato paz y salvo de agremiados desvinculados", "Administrativo"],
  [23, "Base de datos de carnetización", "Administrativo"],
  [24, "Actas de seguimiento a conductas y comportamientos", "Administrativo"],
  [25, "Solicitudes de cubrimiento de personal", "Administrativo"],
  [26, "Informe de costos del personal", "Administrativo"],
  [27, "Informe PAMEC", "Asistencial"],
] as const;
const listaSoportes = (tipo?: TipoPersonal) =>
  documentRequirements(tipo);
const soportes = (tipo?: TipoPersonal, agremiadoId = "") =>
  listaSoportes(tipo).map((nombre) => ({
    id: uid(),
    nombre,
    categoria: tipo || "Asistencial",
    estado: "Pendiente" as EstadoDoc,
    observacion: "Pendiente por cargar",
    agremiadoId,
  }));
const bytes = (n?: number) =>
  !n
    ? ""
    : n < 1024 * 1024
      ? `${Math.round(n / 1024)} KB`
      : `${(n / 1024 / 1024).toFixed(1)} MB`;
const leerArchivo = (file: File) =>
  new Promise<ArchivoLocal>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () =>
      resolve({
        nombre: file.name,
        tipo: file.type || "application/octet-stream",
        tamano: file.size,
        dataUrl: String(r.result),
        fecha: hoy(),
      });
    r.onerror = reject;
    r.readAsDataURL(file);
  });
const dataUrlToBlobUrl = (dataUrl: string) => {
  try {
    const [head, body] = dataUrl.split(",");
    const mime =
      (head.match(/data:(.*?);base64/) || [])[1] || "application/octet-stream";
    const bin = atob(body || "");
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return dataUrl;
  }
};

const seed = (): DB => ({
  usuarios: [
    {
      id: "u1",
      nombre: "Administrador de Sistemas",
      correo: "admin@agreserge.com",
      clave: "1234",
      rol: "Administrador de Sistemas",
      activo: true,
      cargo: "Administrador plataforma",
    },
    {
      id: "u2",
      nombre: "Gerente AGRESERGE",
      correo: "gerente@agreserge.com",
      clave: "1234",
      rol: "Gerente",
      activo: true,
      cargo: "Gerente",
    },
    {
      id: "u3",
      nombre: "Coordinador General Documental",
      correo: "general@agreserge.com",
      clave: "1234",
      rol: "Coordinador General",
      activo: true,
      cargo: "Revisión documental",
    },
    {
      id: "u4",
      nombre: "Coordinadora Administrativa y Financiera",
      correo: "financiera@agreserge.com",
      clave: "1234",
      rol: "Coordinadora Administrativa y Financiera",
      activo: true,
    },
    {
      id: "u5",
      nombre: "Talento Humano AGRESERGE",
      correo: "th@agreserge.com",
      clave: "1234",
      rol: "Talento Humano",
      activo: true,
    },
    {
      id: "u6",
      nombre: "Experiencia al Agremiado",
      correo: "experiencia@agreserge.com",
      clave: "1234",
      rol: "Experiencia al Agremiado",
      activo: true,
    },
    {
      id: "u7",
      nombre: "Líder Urgencias HGC",
      correo: "lider@agreserge.com",
      clave: "1234",
      rol: "Líder Institucional",
      entidadId: "hgc",
      areaId: "urg",
      activo: true,
      cargo: "Líder institucional",
    },
    {
      id: "u8",
      nombre: "Coordinador de Proceso AGRESERGE",
      correo: "proceso@agreserge.com",
      clave: "1234",
      rol: "Coordinador de Proceso AGRESERGE",
      activo: true,
    },
  ],
  entidades: [
    {
      id: "hgc",
      nombre: "Hospital Gonzalo Contreras E.S.E.",
      nit: "891.900.XXX-1",
      ciudad: "La Unión, Valle",
      direccion: "La Unión, Valle",
    },
    {
      id: "hsf",
      nombre: "Hospital Sagrada Familia E.S.E.",
      nit: "891.900.XXX-2",
      ciudad: "Toro, Valle",
      direccion: "Toro, Valle",
    },
    {
      id: "hsv",
      nombre: "Hospital Henry Valencia Orozco E.S.E.",
      nit: "",
      ciudad: "Versalles, Valle",
      direccion: "Versalles, Valle",
    },
    {
      id: "oficina-agreserge",
      nombre: "Oficina AGRESERGE",
      nit: "",
      ciudad: "Valle del Cauca",
      direccion: "Valle del Cauca",
    },
  ],
  areas: [
    {
      id: "urg",
      nombre: "Urgencias",
      entidadId: "hgc",
      tipo: "Asistencial",
      liderId: "u7",
    },
    {
      id: "hos",
      nombre: "Hospitalización",
      entidadId: "hgc",
      tipo: "Asistencial",
    },
    {
      id: "adm",
      nombre: "Administrativa y financiera",
      entidadId: "hgc",
      tipo: "Administrativo",
    },
    {
      id: "fac",
      nombre: "Facturación",
      entidadId: "hsf",
      tipo: "Administrativo",
    },
  ],
  documentos: {},
  permisos: {
    Agremiado: [
      "Ficha técnica",
      "Cargue documental",
      "Nómina y comprobantes",
      "Solicitudes y firmas",
      "Trámites administrativos",
      "AGREBOT",
    ],
    "Líder Institucional": [
      "Inicio",
      "Mis agremiados",
      "Informes de actividades",
      "Solicitudes y firmas",
      "AGREBOT",
    ],
    "Coordinador de Proceso AGRESERGE": [
      "Inicio",
      "Informes de actividades",
      "Asignación mensual",
      "AGREBOT",
      "Auditoría",
    ],
    "Coordinador General": [
      "Inicio",
      "Dashboard gerente",
      "Revisión documental",
      "Informes de actividades",
      "Asignación mensual",
      "Usuarios y claves",
      "AGREBOT",
      "Auditoría",
    ],
    "Coordinadora Administrativa y Financiera": [
      "Inicio",
      "Dashboard gerente",
      "Informes de actividades",
      "Asignación mensual",
      "Nómina y comprobantes",
      "Solicitudes y firmas",
      "Trámites administrativos",
      "Auditoría",
      "AGREBOT",
    ],
    "Talento Humano": [
      "Inicio",
      "Parámetros institucionales",
      "Usuarios y claves",
      "Ficha técnica",
      "AGREBOT",
    ],
    "Experiencia al Agremiado": [
      "Inicio",
      "Usuarios y claves",
      "Ficha técnica",
      "AGREBOT",
    ],
    "Administrador de Sistemas": [
      "Inicio",
      "Parámetros institucionales",
      "Nómina y comprobantes",
      "Solicitudes y firmas",
      "Permisos por perfil",
      "Usuarios y claves",
      "AGREBOT",
      "Auditoría",
    ],
    Gerente: [
      "Inicio",
      "Dashboard gerente",
      "Informes de actividades",
      "Auditoría",
      "AGREBOT",
    ],
  },
  asignacionesBase: [],
  asignacionesMensuales: [],
  tramites: [],
  auditoria: ["Sistema inicializado en base local del navegador."],
});
function useDB() {
  const [db, setDb] = useState<DB | null>(null);
  const [sync, setSync] = useState("local");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("portal_agreserge_db_v31");
      setDb(raw ? JSON.parse(raw) : seed());
    } catch {
      setDb(seed());
    }
  }, []);
  const save = async (n: DB, evento?: string) => {
    const nuevo = {
      ...n,
      auditoria: evento
        ? [`${new Date().toLocaleString()} · ${evento}`, ...(n.auditoria || [])]
        : n.auditoria,
    };
    setDb(nuevo);
    localStorage.setItem("portal_agreserge_db_v31", JSON.stringify(nuevo));
    setSync("guardando");
    try {
      const payload = await saveRemoteDB(nuevo);
      if (payload?.db) {
        setDb(payload.db);
        localStorage.setItem(
          "portal_agreserge_db_v31",
          JSON.stringify(payload.db),
        );
      }
      setSync("supabase");
    } catch (e: any) {
      setSync("local");
      alert(
        e.message ||
          "No se pudo sincronizar con Supabase. Se conservó copia local.",
      );
    }
  };
  return { db, save, setDb, sync, setSync };
}
const entidadNombre = (db: DB, id?: string) =>
  db.entidades.find((e) => e.id === id)?.nombre || "Sin entidad";
const areaNombre = (db: DB, id?: string) =>
  db.areas.find((a) => a.id === id)?.nombre || "Sin área";
const usuarioNombre = (db: DB, id?: string) =>
  db.usuarios.find((u) => u.id === id)?.nombre || "Sin asignar";
const estadoInforme = (a: Asignacion) =>
  a.fechaCarga && a.fechaCarga > a.fechaLimite ? "Extemporáneo" : a.estado;

export default function Page() {
  const { db, save, setDb, sync, setSync } = useDB();
  const [session, setSession] = useState<Usuario | null>(null);
  const [form, setForm] = useState({ correo: "", clave: "" });
  const [nav, setNav] = useState("Inicio");
  if (!db) return null;
  const login = async () => {
    try {
      setSync("conectando");
      const payload = await remoteLogin(form.correo, form.clave);
      const next = payload.db as DB;
      setDb(next);
      localStorage.setItem("portal_agreserge_db_v31", JSON.stringify(next));
      const u = next.usuarios.find((x) => x.id === payload.userId);
      if (u) {
        setSession(u);
        const mustComplete =
          u.rol === "Agremiado" &&
          !isSocioProfileComplete(next.perfiles?.[u.id]);
        const ps = next.permisos[u.rol] || ["Ficha técnica"];
        setNav(mustComplete ? "Ficha técnica" : ps[0] || "Ficha técnica");
        setSync("supabase");
      }
    } catch (e: any) {
      setSync("local");
      alert(e.message || "Usuario, contraseña o perfil inactivo");
    }
  };
  if (!session)
    return <Login form={form} setForm={setForm} login={login} sync={sync} />;
  const onboarding =
    session.rol === "Agremiado" &&
    !isSocioProfileComplete(db.perfiles?.[session.id]);
  const permitidos = onboarding
    ? ["Ficha técnica"]
    : db.permisos[session.rol] || ["Inicio"];
  const menu = permitidos.includes(nav)
    ? nav
    : permitidos[0] || "Ficha técnica";
  const salir = async () => {
    await remoteLogout();
    setSession(null);
  };
  const cambiarMiClave = async () => {
    const actual = prompt("Escribe tu contraseña actual");
    if (!actual) return;
    const nueva = prompt("Escribe tu nueva contraseña (mínimo 8 caracteres)");
    if (!nueva) return;
    const confirmar = prompt("Confirma la nueva contraseña");
    if (nueva !== confirmar) return alert("Las contraseñas nuevas no coinciden.");
    try {
      await changeOwnPassword(actual, nueva);
      alert("Contraseña actualizada correctamente.");
    } catch (error: any) {
      alert(error.message || "No se pudo cambiar la contraseña.");
    }
  };
  return (
    <div className="app">
      <aside className="side">
        <div className="sideBrand">
          <img src="/logo.png" />
          <div>
            <b>Portal AGRESERGE</b>
            <span>{roleLabel(session.rol)}</span>
          </div>
        </div>
        {onboarding && (
          <div className="onboardingNotice">
            <Lock size={16} />
            <span>Completa primero tu perfil sociodemográfico.</span>
          </div>
        )}
        <nav className="nav">
          {permitidos.map((m) => (
            <button
              key={m}
              className={menu === m ? "active" : ""}
              onClick={() => setNav(m)}
            >
              {icon(m)}
              {m}
            </button>
          ))}
        </nav>
        <button className="btn ghost" onClick={cambiarMiClave}>
          <KeyRound size={16} /> Cambiar mi clave
        </button>
        <button className="btn ghost" onClick={salir}>
          <LogOut size={16} /> Salir
        </button>
      </aside>
      <main className="main">
        <div className="top">
          <div>
            <span className="badge">{session.nombre}</span>
            <h1>{menu}</h1>
          </div>
          <span className="badge">
            {sync === "supabase"
              ? "Supabase conectado"
              : sync === "guardando"
                ? "Guardando en Supabase..."
                : sync === "conectando"
                  ? "Conectando..."
                  : "Copia local activa"}
          </span>
        </div>
        <Content
          nav={menu}
          session={session}
          db={db}
          save={save}
          setDb={setDb}
          setSession={setSession}
        />
      </main>
    </div>
  );
}
function Login({ form, setForm, login, sync }: any) {
  return (
    <div className="loginPage">
      <div className="loginGlow glowBlue" />
      <div className="loginGlow glowGold" />
      <section className="brandPanel">
        <div className="institutionalMark">
          <div className="logoShell">
            <img src="/logo.png" className="logo" />
          </div>
          <div className="kicker">Portal institucional</div>
          <h1>AGRESERGE</h1>
          <div className="brandAccent" />
        </div>
      </section>
      <section className="loginCard">
        <div className="loginIcon">
          <Lock />
        </div>
        <div className="loginHeading">
          <span>Acceso institucional</span>
          <h2>Bienvenido</h2>
          <p className="loginIntro">
            Ingresa con tu nombre de usuario y contraseña para continuar.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            login();
          }}
        >
          <div className="field">
            <label>Nombre de usuario</label>
            <input
              className="input"
              autoComplete="username"
              inputMode="text"
              autoCapitalize="none"
              placeholder="Ej. coord.administrativa"
              value={form.correo}
              onChange={(e) =>
                setForm({
                  ...form,
                  correo: e.target.value.toLowerCase().replace(/\s+/g, "."),
                })
              }
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              value={form.clave}
              onChange={(e) => setForm({ ...form, clave: e.target.value })}
            />
          </div>
          <button
            className="btn primary loginSubmit"
            type="submit"
            disabled={sync === "conectando" || !form.correo || !form.clave}
          >
            {sync === "conectando"
              ? "Validando acceso..."
              : "Ingresar al portal"}
          </button>
        </form>
        <div className="secureNote">
          <ShieldCheck size={15} /> Acceso seguro y protegido
        </div>
      </section>
    </div>
  );
}
function Content(p: any) {
  const { nav } = p;
  if (nav === "Inicio") return <Inicio {...p} />;
  if (nav === "Dashboard gerente") return <Dashboard {...p} />;
  if (nav === "Parámetros institucionales") return <Parametros {...p} />;
  if (nav === "Ficha técnica") return <TechnicalProfiles {...p} />;
  if (nav === "Cargue documental") return <Cargue {...p} />;
  if (nav === "Revisión documental") return <Revision {...p} />;
  if (nav === "Mis agremiados") return <MisAgremiados {...p} />;
  if (nav === "Informes de actividades") return <Informes {...p} />;
  if (nav === "Asignación mensual") return <AsignacionMensual {...p} />;
  if (nav === "Nómina y comprobantes") return <NominaComprobantes {...p} />;
  if (nav === "Solicitudes y firmas") return <SolicitudesFirmas {...p} />;
  if (nav === "Trámites administrativos")
    return <TramitesAdministrativos {...p} />;
  if (nav === "Permisos por perfil") return <Permisos {...p} />;
  if (nav === "Usuarios y claves") return <Usuarios {...p} />;
  if (nav === "AGREBOT") return <Agrebot {...p} />;
  if (nav === "Auditoría") return <Auditoria {...p} />;
  return null;
}
function Inicio({ session, db }: any) {
  const docs = db.documentos[session.id] || [];
  const cargados = docs.filter((d: Documento) => d.archivo).length;
  const esAg = session.rol === "Agremiado";
  return (
    <div className="grid">
      <div className="welcomeCard span12">
        <div>
          <span className="welcomeTag">Portal AGRESERGE</span>
          <h2>
            {esAg
              ? "Mi espacio documental"
              : "Bienvenido al panel institucional"}
          </h2>
          <p>
            {esAg
              ? "Aquí puedes actualizar tu ficha técnica, cargar tus soportes desde el computador, previsualizarlos y consultar AGREBOT."
              : "Acceso configurado según tu perfil, con módulos, reportes, informes y permisos autorizados."}
          </p>
        </div>
        <div className="welcomeLogo">
          <img src="/logo.png" />
        </div>
      </div>
      <KPI t="Mi perfil" n={session.rol} i={<UserCog />} />
      <KPI
        t="Entidad"
        n={entidadNombre(db, session.entidadId)}
        i={<Building2 />}
      />
      <KPI t="Área" n={areaNombre(db, session.areaId)} i={<FolderKanban />} />
      <KPI
        t="Documentos cargados"
        n={`${cargados}/${docs.length || 0}`}
        i={<Upload />}
      />
      {esAg && (
        <div className="card span12">
          <h3>Accesos disponibles para agremiado</h3>
          <div className="moduleGrid">
            <div className="moduleMini">
              <ClipboardCheck /> Ficha técnica
            </div>
            <div className="moduleMini">
              <Upload /> Cargue documental
            </div>
            <div className="moduleMini">
              <Bot /> AGREBOT
            </div>
          </div>
          <p className="muted">
            No se muestran dashboard, inicio administrativo, revisión documental
            ni módulos internos.
          </p>
        </div>
      )}
    </div>
  );
}
function Dashboard({ db }: any) {
  const ag = db.usuarios.filter((u: Usuario) => u.rol === "Agremiado");
  const docs = Object.values(db.documentos).flat() as Documento[];
  const cargados = docs.filter((d) => d.archivo).length;
  const aprobados = docs.filter((d) => d.estado === "Aprobado").length;
  const rechazados = docs.filter((d) => d.estado === "Rechazado").length;
  const devueltos = docs.filter((d) => d.estado === "Devuelto").length;
  const pendientes = docs.length - cargados;
  const ex = db.asignacionesMensuales.filter(
    (a: Asignacion) => estadoInforme(a) === "Extemporáneo",
  ).length;
  const porEntidad = db.entidades.map((e: Entidad) => ({
    e,
    total: ag.filter((u: Usuario) => u.entidadId === e.id).length,
    docs: (Object.values(db.documentos).flat() as Documento[]).filter(
      (d: any) =>
        ag.find((u: Usuario) => u.id === d.agremiadoId)?.entidadId === e.id,
    ),
  }));
  const porEstado = [
    "Pendiente",
    "Cargado",
    "Aprobado",
    "Rechazado",
    "Devuelto",
  ].map((est) => ({ est, total: docs.filter((d) => d.estado === est).length }));
  const maxEstado = Math.max(1, ...porEstado.map((x) => x.total));
  const maxEntidad = Math.max(1, ...porEntidad.map((x: any) => x.total));
  const informeUnificado = () => {
    const lineas = [
      "INFORME MASIVO UNIFICADO - PORTAL AGRESERGE",
      `Fecha: ${hoy()}`,
      "",
      `Entidades: ${db.entidades.length}`,
      `Áreas: ${db.areas.length}`,
      `Agremiados: ${ag.length}`,
      `Documentos cargados: ${cargados}/${docs.length}`,
      `Documentos aprobados: ${aprobados}`,
      `Documentos rechazados: ${rechazados}`,
      `Documentos devueltos: ${devueltos}`,
      `Informes mensuales: ${db.asignacionesMensuales.length}`,
      `Extemporáneos: ${ex}`,
      "",
      "Detalle por entidad:",
      ...porEntidad.map(
        (x: any) =>
          `- ${x.e.nombre}: ${x.total} agremiados, ${x.docs.filter((d: Documento) => d.archivo).length} documentos cargados`,
      ),
      "",
      "Detalle documental por agremiado:",
      ...ag.map(
        (u: Usuario) =>
          `- ${u.nombre} | ${entidadNombre(db, u.entidadId)} | ${areaNombre(db, u.areaId)} | ${(db.documentos[u.id] || []).filter((d: Documento) => d.archivo).length}/${(db.documentos[u.id] || []).length} soportes`,
      ),
      "",
      "Informes mensuales:",
      ...db.asignacionesMensuales.map(
        (a: Asignacion) =>
          `- Anexo ${a.anexo} | ${a.mes} ${a.anio} | ${usuarioNombre(db, a.responsableId)} | ${estadoInforme(a)} | ${a.copiaGoogle || a.plantillaGoogle}`,
      ),
      "",
      "Alertas Estadística:",
      ...db.asignacionesMensuales
        .filter((a: Asignacion) => a.notificarEstadistica)
        .map(
          (a: Asignacion) =>
            `- Anexo ${a.anexo} extemporáneo, responsable ${usuarioNombre(db, a.responsableId)}`,
        ),
    ];
    const blob = new Blob([lineas.join("\n")], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `informe_masivo_unificado_${hoy()}.txt`;
    a.click();
  };
  const hoja = () => {
    const filas = [
      "Entidad,Area,Agremiado,Tipo,Documento,Estado,FechaCarga,Observacion",
      ...ag.flatMap((u: Usuario) =>
        (db.documentos[u.id] || []).map(
          (d: Documento) =>
            `"${entidadNombre(db, u.entidadId)}","${areaNombre(db, u.areaId)}","${u.nombre}","${u.tipo}","${d.nombre}","${d.estado}","${d.fechaCarga || ""}","${(d.observacion || "").replace(/"/g, '""')}"`,
        ),
      ),
    ];
    const blob = new Blob([filas.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hoja_calculo_google_importar_${hoy()}.csv`;
    a.click();
  };
  return (
    <div className="grid">
      <KPI
        t="Hospitales / entidades"
        n={db.entidades.length}
        i={<Building2 />}
      />
      <KPI t="Áreas creadas" n={db.areas.length} i={<FolderKanban />} />
      <KPI t="Agremiados" n={ag.length} i={<Users />} />
      <KPI
        t="Cumplimiento documental"
        n={`${docs.length ? Math.round((cargados / docs.length) * 100) : 0}%`}
        i={<CheckCircle2 />}
      />
      <div className="card span4">
        <h3>Gráfica documental por estado</h3>
        {porEstado.map((x) => (
          <div className="barRow" key={x.est}>
            <span>{x.est}</span>
            <div className="barTrack">
              <div
                className="barFill"
                style={{
                  width: `${Math.max(4, (x.total / maxEstado) * 100)}%`,
                }}
              />
            </div>
            <b>{x.total}</b>
          </div>
        ))}
      </div>
      <div className="card span4">
        <h3>Agremiados por hospital</h3>
        {porEntidad.map((x: any) => (
          <div className="barRow" key={x.e.id}>
            <span>{x.e.nombre.slice(0, 22)}</span>
            <div className="barTrack">
              <div
                className="barFill"
                style={{
                  width: `${Math.max(4, (x.total / maxEntidad) * 100)}%`,
                }}
              />
            </div>
            <b>{x.total}</b>
          </div>
        ))}
      </div>
      <div className="card span4">
        <h3>Alertas gerenciales</h3>
        <p>
          <b>{pendientes}</b> soportes pendientes
        </p>
        <p>
          <b>{aprobados}</b> aprobados · <b>{rechazados}</b> rechazados ·{" "}
          <b>{devueltos}</b> devueltos
        </p>
        <p>
          <b>{ex}</b> informes extemporáneos
        </p>
        <button className="btn primary" onClick={informeUnificado}>
          <Download size={16} /> Generar informe masivo unificado
        </button>
        <button className="btn" onClick={hoja}>
          <Download size={16} /> Generar hoja CSV para Google Sheets
        </button>
      </div>
      <div className="card span8">
        <h3>Analytics gerencial por entidad</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Entidad</th>
              <th>Agremiados</th>
              <th>Áreas</th>
              <th>Contrato</th>
              <th>Documentos cargados</th>
            </tr>
          </thead>
          <tbody>
            {porEntidad.map((x: any) => (
              <tr key={x.e.id}>
                <td>
                  <b>{x.e.nombre}</b>
                  <br />
                  <span className="mini">
                    {x.e.nit} · {x.e.ciudad}
                  </span>
                </td>
                <td>{x.total}</td>
                <td>
                  {db.areas.filter((a: Area) => a.entidadId === x.e.id).length}
                </td>
                <td>
                  {x.e.contrato ? (
                    <span className="pill ok">Cargado</span>
                  ) : (
                    <span className="pill pend">Pendiente</span>
                  )}
                </td>
                <td>
                  {x.docs.filter((d: Documento) => d.archivo).length}/
                  {x.docs.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card span4">
        <h3>Seguimiento de informes</h3>
        <p className="muted">
          Incluye vínculos Google Docs y salida CSV para pegar/importar en
          Google Sheets.
        </p>
        <table className="table">
          <tbody>
            {db.asignacionesMensuales.slice(0, 8).map((a: Asignacion) => (
              <tr key={a.id}>
                <td>Anexo {a.anexo}</td>
                <td>
                  <span
                    className={`pill ${estadoInforme(a) === "Extemporáneo" ? "bad" : "rev"}`}
                  >
                    {estadoInforme(a)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function KPI({ t, n, i }: any) {
  return (
    <div className="card span3 kpiCard">
      <div className="kpiIcon">{i}</div>
      <div className="kpiValue">{n}</div>
      <p className="muted kpiLabel">{t}</p>
    </div>
  );
}
function Parametros({ db, save }: any) {
  const [contractPreview, setContractPreview] = useState<any>(null);
  const [ent, setEnt] = useState<any>({
    nombre: "",
    nit: "",
    ciudad: "",
    direccion: "",
  });
  const [area, setArea] = useState<any>({ tipo: "Administrativo" });
  const addEnt = () => {
    if (!ent.nombre) return alert("Digite nombre de la entidad");
    save(
      { ...db, entidades: [...db.entidades, { id: uid(), ...ent }] },
      `Entidad creada: ${ent.nombre}`,
    );
    setEnt({ nombre: "", nit: "", ciudad: "", direccion: "" });
  };
  const addArea = () => {
    if (!area.nombre || !area.entidadId) return alert("Digite área y entidad");
    save(
      { ...db, areas: [...db.areas, { id: uid(), ...area }] },
      `Área creada: ${area.nombre}`,
    );
    setArea({ tipo: "Administrativo" });
  };
  const contrato = async (eid: string, file?: File) => {
    if (!file) return;
    const ar = await leerArchivo(file);
    save(
      {
        ...db,
        entidades: db.entidades.map((e: Entidad) =>
          e.id === eid ? { ...e, contrato: ar, fechaContrato: hoy() } : e,
        ),
      },
      `Contrato cargado para ${entidadNombre(db, eid)}`,
    );
  };
  const lideres = db.usuarios.filter(
    (u: Usuario) => u.rol === "Líder Institucional",
  );
  const asignar = (areaId: string, liderId: string) =>
    save(
      {
        ...db,
        areas: db.areas.map((a: Area) =>
          a.id === areaId ? { ...a, liderId } : a,
        ),
        usuarios: db.usuarios.map((u: Usuario) =>
          u.id === liderId
            ? {
                ...u,
                areaId,
                entidadId: db.areas.find((a: Area) => a.id === areaId)
                  ?.entidadId,
              }
            : u,
        ),
      },
      `Líder asignado al área ${areaNombre(db, areaId)}`,
    );
  return (
    <div className="grid">
      <div className="card span4">
        <h3>Crear hospital / institución</h3>
        <input
          className="input"
          placeholder="Nombre"
          value={ent.nombre}
          onChange={(e) => setEnt({ ...ent, nombre: e.target.value })}
        />
        <input
          className="input"
          placeholder="NIT"
          value={ent.nit}
          onChange={(e) => setEnt({ ...ent, nit: e.target.value })}
        />
        <input
          className="input"
          placeholder="Ciudad"
          value={ent.ciudad}
          onChange={(e) => setEnt({ ...ent, ciudad: e.target.value })}
        />
        <input
          className="input"
          placeholder="Dirección"
          value={ent.direccion}
          onChange={(e) => setEnt({ ...ent, direccion: e.target.value })}
        />
        <button className="btn primary" onClick={addEnt}>
          <Plus size={16} /> Crear entidad
        </button>
      </div>
      <div className="card span4">
        <h3>Crear áreas</h3>
        <select
          value={area.entidadId || ""}
          onChange={(e) => setArea({ ...area, entidadId: e.target.value })}
        >
          <option value="">Seleccione entidad</option>
          {db.entidades.map((e: Entidad) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Nombre del área"
          value={area.nombre || ""}
          onChange={(e) => setArea({ ...area, nombre: e.target.value })}
        />
        <select
          value={area.tipo}
          onChange={(e) => setArea({ ...area, tipo: e.target.value })}
        >
          <option>Administrativo</option>
          <option>Asistencial</option>
        </select>
        <button className="btn primary" onClick={addArea}>
          <Plus size={16} /> Crear área
        </button>
      </div>
      <div className="card span4">
        <h3>Contratos de entidades</h3>
        <p className="muted">
          Carga contratos desde el computador. Quedan guardados localmente en el
          navegador.
        </p>
        {db.entidades.map((e: Entidad) => (
          <div className="docReview" key={e.id}>
            <b>{e.nombre}</b>
            <br />
            <span className="mini">
              {e.contrato
                ? `${e.contrato.nombre} · ${bytes(e.contrato.tamano)} · ${e.fechaContrato}`
                : "Contrato pendiente"}
            </span>
            <input
              type="file"
              className="input"
              onChange={(ev) => contrato(e.id, ev.target.files?.[0])}
            />
            {e.contrato && (
              <div className="row">
                <button className="btn" onClick={() => setContractPreview({ ...e.contrato, entidad: e.nombre })}>
                  <Eye size={14} /> Previsualizar
                </button>
                <a className="btn" href={e.contrato.dataUrl} download={e.contrato.nombre}>
                  <Download size={14} /> Descargar
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
      {contractPreview && (
        <div className="previewOverlay" onClick={() => setContractPreview(null)}>
          <div className="previewModal" onClick={(event) => event.stopPropagation()}>
            <div className="sectionTitleRow">
              <div><span className="badge">CONTRATO INSTITUCIONAL</span><h3>{contractPreview.entidad}</h3><p>{contractPreview.nombre}</p></div>
              <button className="btn" onClick={() => setContractPreview(null)}><XCircle size={16} /> Cerrar</button>
            </div>
            {String(contractPreview.tipo).includes("pdf") || String(contractPreview.tipo).startsWith("image/")
              ? <iframe title="Previsualización del contrato" src={contractPreview.dataUrl} className="documentFrame" />
              : <div className="emptyState"><FileText size={42} /><b>Vista previa externa</b><span>Word y Excel se abren en una nueva pestaña para conservar su formato.</span><a className="btn primary" href={contractPreview.dataUrl} target="_blank" rel="noreferrer">Abrir documento</a></div>}
          </div>
        </div>
      )}
      <div className="card span12">
        <h3>Asignar líderes a áreas de hospitales</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Entidad</th>
              <th>Área</th>
              <th>Tipo</th>
              <th>Líder asignado</th>
              <th>Cambiar líder</th>
            </tr>
          </thead>
          <tbody>
            {db.areas.map((a: Area) => (
              <tr key={a.id}>
                <td>{entidadNombre(db, a.entidadId)}</td>
                <td>
                  <b>{a.nombre}</b>
                </td>
                <td>{a.tipo}</td>
                <td>{usuarioNombre(db, a.liderId)}</td>
                <td>
                  <select
                    value={a.liderId || ""}
                    onChange={(e) => asignar(a.id, e.target.value)}
                  >
                    <option value="">Sin asignar</option>
                    {lideres.map((l: Usuario) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Ficha({ db, save, session, setSession }: any) {
  const [local, setLocal] = useState<Usuario>(session);
  const areas = db.areas.filter((a: Area) => a.entidadId === local.entidadId);
  const guardar = () => {
    let docs = db.documentos[local.id] || [];
    const cambioTipo = local.tipo !== session.tipo;
    if (cambioTipo) docs = soportes(local.tipo, local.id);
    const usuarios = db.usuarios.map((u: Usuario) =>
      u.id === local.id ? local : u,
    );
    save(
      { ...db, usuarios, documentos: { ...db.documentos, [local.id]: docs } },
      `Ficha técnica actualizada: ${local.nombre}`,
    );
    setSession(local);
    alert(
      cambioTipo
        ? "Ficha actualizada y lista de soportes reiniciada según tipo de personal."
        : "Ficha técnica guardada.",
    );
  };
  return (
    <div className="card">
      <h3>Ficha técnica del agremiado</h3>
      <p className="muted">
        Al cambiar Administrativo/Asistencial se actualiza automáticamente la
        lista de soportes del cargue documental.
      </p>
      <div className="grid">
        <div className="span6 field">
          <label>Nombre</label>
          <input
            className="input"
            value={local.nombre}
            onChange={(e) => setLocal({ ...local, nombre: e.target.value })}
          />
        </div>
        <div className="span6 field">
          <label>Correo</label>
          <input
            className="input"
            value={local.correo}
            onChange={(e) => setLocal({ ...local, correo: e.target.value })}
          />
        </div>
        <div className="span4 field">
          <label>Tipo de personal</label>
          <select
            value={local.tipo || "Asistencial"}
            onChange={(e) =>
              setLocal({ ...local, tipo: e.target.value as TipoPersonal })
            }
          >
            <option>Asistencial</option>
            <option>Administrativo</option>
          </select>
        </div>
        <div className="span4 field">
          <label>Entidad / hospital</label>
          <select
            value={local.entidadId || ""}
            onChange={(e) =>
              setLocal({ ...local, entidadId: e.target.value, areaId: "" })
            }
          >
            <option value="">Seleccione</option>
            {db.entidades.map((e: Entidad) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="span4 field">
          <label>Área</label>
          <select
            value={local.areaId || ""}
            onChange={(e) =>
              setLocal({
                ...local,
                areaId: e.target.value,
                liderId: db.areas.find((a: Area) => a.id === e.target.value)
                  ?.liderId,
              })
            }
          >
            <option value="">Seleccione</option>
            {areas.map((a: Area) => (
              <option key={a.id} value={a.id}>
                {a.nombre} · {a.tipo}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className="btn primary" onClick={guardar}>
        <Save size={16} /> Guardar ficha
      </button>
    </div>
  );
}
function Cargue({ db, setDb, session }: any) {
  const storedDocs: Documento[] = db.documentos[session.id] || [];
  const officialDocs = soportes(session.tipo, session.id);
  const docs: Documento[] = [
    ...officialDocs.map(
      (required) =>
        storedDocs.find((saved) => saved.nombre === required.nombre) || required,
    ),
    ...storedDocs.filter(
      (saved) =>
        saved.archivo &&
        !officialDocs.some((required) => required.nombre === saved.nombre),
    ),
  ];
  const [uploading, setUploading] = useState("");
  const [previewId, setPreviewId] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const previewDoc = docs.find((doc) => doc.id === previewId && doc.archivo);
  useEffect(() => () => { if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const previsualizar = async (doc: Documento) => {
    if (!doc.archivo) return;
    try {
      const response = await fetch(doc.archivo.dataUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("El archivo anterior ya no está disponible. Cárguelo nuevamente para restaurarlo.");
      if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(await response.blob()));
      setPreviewId(doc.id);
    } catch (error: any) {
      alert(error.message || "No fue posible abrir el archivo");
    }
  };
  const syncDb = (payload: any) => {
    if (payload.db) {
      setDb(payload.db);
      localStorage.setItem(
        "portal_agreserge_db_v31",
        JSON.stringify(payload.db),
      );
    }
  };
  const cargar = async (d: Documento, files?: FileList | null) => {
    if (!files?.length) return;
    setUploading(d.id);
    try {
      let occupied = Boolean(d.archivo);
      for (const file of Array.from(files)) {
        const payload = await uploadDocument(d.id, file, occupied, {
          name: d.nombre,
          category: d.categoria,
        });
        syncDb(payload);
        occupied = true;
      }
      alert(
        `${files.length} archivo(s) cargado(s) correctamente y enviado(s) a revisión.`,
      );
    } catch (e: any) {
      alert(e.message || "No se pudo cargar el documento");
    } finally {
      setUploading("");
    }
  };
  const eliminar = async (d: Documento) => {
    if (!confirm(`¿Eliminar ${d.archivo?.nombre || d.nombre}?`)) return;
    try {
      syncDb(await deleteDocument(d.id));
      alert("Documento eliminado correctamente.");
    } catch (e: any) {
      alert(e.message);
    }
  };
  const bases = docs.filter((d: Documento) => !d.nombre.includes(" — "));
  const pct = bases.length
    ? Math.round(
        (bases.filter((d: Documento) => d.archivo).length / bases.length) * 100,
      )
    : 0;
  return (
    <div className="card">
      <div className="row between">
        <div>
          <h3>Cargue documental seguro</h3>
          <p className="muted">
            Selecciona uno o varios PDF, imágenes, Word o Excel. Puedes
            previsualizar, reemplazar y eliminar cada archivo. Máximo 10 MB por
            archivo.
          </p>
        </div>
        <span className="badge">
          {docs.filter((d: Documento) => d.archivo).length} archivos protegidos
        </span>
      </div>
      <div className="progress">
        <i style={{ width: pct + "%" }} />
      </div>
      <p>
        <b>{pct}%</b> de requisitos documentales completos
      </p>
      <div className="documentWorkspace affiliateUploadWorkspace">
        <div className="documentList">
      {docs.map((d: Documento) => (
        <div className={`docItem ${previewId === d.id ? "selected" : ""}`} key={d.id || d.nombre}>
          <div>
            <b>{d.nombre}</b>
            {d.nombre.startsWith("Cursos y soportes") && (
              <details className="mini" style={{ marginTop: 8 }}>
                <summary>Ver cursos exigidos según área o servicio</summary>
                <ul>
                  {healthcareCourseDetails.map((course) => (
                    <li key={course}>{course}</li>
                  ))}
                </ul>
              </details>
            )}
            <br />
            <span className="mini">
              {d.archivo
                ? `${d.archivo.nombre} · ${bytes(d.archivo.tamano)} · ${d.fechaCarga}`
                : "Pendiente por cargar"}
            </span>
          </div>
          <span
            className={`pill ${d.estado === "Aprobado" ? "ok" : d.estado === "Rechazado" ? "bad" : d.estado === "Devuelto" ? "obs" : d.estado === "Cargado" ? "rev" : "pend"}`}
          >
            {d.estado}
          </span>
          <p className="obsBox">{d.observacion}</p>
          <div className="row">
            <input
              type="file"
              multiple
              className="input"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
              disabled={uploading === d.id}
              onChange={(e) => cargar(d, e.target.files)}
            />
            {uploading === d.id && (
              <span className="mini">Cargando archivos de forma segura…</span>
            )}
            {d.archivo && (
              <>
                <button className="btn" onClick={() => previsualizar(d)}>
                  <Eye size={14} /> Previsualizar
                </button>
                <button className="btn danger" onClick={() => eliminar(d)}>
                  <XCircle size={14} /> Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      ))}
        </div>
        {previewDoc?.archivo && <div className="modal" role="dialog" aria-modal="true">
        <aside className="documentPreview affiliatePreviewModal">
          <div className="previewHeading">
            <div>
              <span className="welcomeTag">Vista rápida</span>
              <h3>{previewDoc?.nombre || "Previsualizador"}</h3>
            </div>
            {previewDoc?.archivo && (
              <div className="row"><a className="btn ghost" href={previewDoc.archivo.dataUrl} target="_blank" rel="noreferrer"><Eye size={14} /> Abrir completo</a><button className="btn danger" onClick={() => setPreviewId("")}><XCircle size={14} /> Cerrar</button></div>
            )}
          </div>
          {previewDoc.archivo.tipo.startsWith("image/") ? (
            <img className="inlineDocumentPreview" src={previewUrl} alt={previewDoc.archivo.nombre} />
          ) : previewDoc.archivo.tipo === "application/pdf" || previewDoc.archivo.nombre.toLowerCase().endsWith(".pdf") ? (
            <iframe className="inlineDocumentPreview" src={previewUrl} title={previewDoc.archivo.nombre} />
          ) : (
            <div className="previewEmpty">
              <FileText size={52} />
              <b>{previewDoc.archivo.nombre}</b>
              <span>Este archivo de Word o Excel se abre en su visor completo.</span>
              <a className="btn primary" href={previewDoc.archivo.dataUrl} target="_blank" rel="noreferrer">Abrir documento</a>
            </div>
          )}
        </aside>
        </div>}
      </div>
    </div>
  );
}
function Revision({ db, save }: any) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [reviewPreviewUrl, setReviewPreviewUrl] = useState("");
  const [aiReport, setAiReport] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [f, setF] = useState({
    entidadId: "",
    areaId: "",
    q: "",
    estado: "",
  });
  const filteredAreas = db.areas.filter(
    (area: Area) => !f.entidadId || area.entidadId === f.entidadId,
  );
  const ag = db.usuarios
    .filter((u: Usuario) => u.rol === "Agremiado")
    .filter(
      (u: Usuario) =>
        (!f.entidadId || u.entidadId === f.entidadId) &&
        (!f.areaId || u.areaId === f.areaId) &&
        (!f.q ||
          `${u.nombre} ${u.correo} ${db.perfiles?.[u.id]?.documento || ""}`
            .toLowerCase()
            .includes(f.q.toLowerCase())),
    );
  const selectedUser = ag.find((u: Usuario) => u.id === selectedUserId);
  const selectedDocs: Documento[] = selectedUser
    ? (db.documentos[selectedUser.id] || []).filter(
        (d: Documento) => !f.estado || d.estado === f.estado,
      )
    : [];
  const selectedDoc = selectedDocs.find((d) => d.id === selectedDocId);
  useEffect(() => () => { if (reviewPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(reviewPreviewUrl); }, [reviewPreviewUrl]);
  const selectReviewDocument = async (doc: Documento) => {
    setSelectedDocId(doc.id);
    if (reviewPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(reviewPreviewUrl);
    setReviewPreviewUrl("");
    if (!doc.archivo) return;
    try {
      const response = await fetch(doc.archivo.dataUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("El archivo no se encuentra en el almacenamiento. Solicite al afiliado cargarlo nuevamente.");
      setReviewPreviewUrl(URL.createObjectURL(await response.blob()));
    } catch (error: any) {
      alert(error.message);
    }
  };
  const cambiar = (uidDoc: string, docId: string, estado: EstadoDoc) => {
    const obs = prompt(`Observación para estado ${estado}`, "") || "";
    const lista = (db.documentos[uidDoc] || []).map((d: Documento) =>
      d.id === docId
        ? {
            ...d,
            estado,
            observacion: obs || `Documento ${estado.toLowerCase()}`,
          }
        : d,
    );
    save(
      { ...db, documentos: { ...db.documentos, [uidDoc]: lista } },
      `Revisión documental: ${usuarioNombre(db, uidDoc)} · ${estado}`,
    );
  };
  const analizarConIA = async () => {
    if (!selectedUser) return;
    setAiLoading(true);
    setAiReport(null);
    try {
      setAiReport(await reviewAffiliateDocuments(selectedUser.id));
    } catch (error: any) {
      setAiReport({ error: error.message });
    } finally {
      setAiLoading(false);
    }
  };
  return (
    <div className="card">
      <h3>Revisión documental con previsualización</h3>
      <p className="muted">
        Filtre por entidad y área, seleccione al afiliado y revise sus soportes
        directamente en pantalla antes de aprobar, rechazar o devolver.
      </p>
      <div className="reviewFilters">
        <select
          value={f.entidadId}
          onChange={(e) => {
            setF({ ...f, entidadId: e.target.value, areaId: "" });
            setSelectedUserId("");
            setSelectedDocId("");
          }}
        >
          <option value="">Todas las entidades</option>
          {db.entidades.map((e: Entidad) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
        <select
          value={f.areaId}
          onChange={(e) => {
            setF({ ...f, areaId: e.target.value });
            setSelectedUserId("");
            setSelectedDocId("");
          }}
        >
          <option value="">Todas las áreas o servicios</option>
          {filteredAreas.map((area: Area) => (
            <option key={area.id} value={area.id}>{area.nombre}</option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Buscar por nombre, documento o correo"
          value={f.q}
          onChange={(e) => {
            setF({ ...f, q: e.target.value });
            setSelectedUserId("");
            setSelectedDocId("");
          }}
        />
        <select
          value={f.estado}
          onChange={(e) => setF({ ...f, estado: e.target.value })}
        >
          <option value="">Todos los estados</option>
          <option>Pendiente</option>
          <option>Cargado</option>
          <option>Aprobado</option>
          <option>Rechazado</option>
          <option>Devuelto</option>
        </select>
      </div>
      <div className="reviewDirectory">
        <aside className="affiliateResults">
          <div className="reviewColumnTitle">
            <b>Afiliados encontrados</b><span>{ag.length}</span>
          </div>
          {ag.map((u: Usuario) => {
            const loaded = (db.documentos[u.id] || []).filter((d: Documento) => d.archivo).length;
            return (
              <button
                key={u.id}
                className={`affiliateResult ${u.id === selectedUserId ? "active" : ""}`}
                onClick={() => { setSelectedUserId(u.id); setSelectedDocId(""); }}
              >
                <UserCog size={18} />
                <span><b>{u.nombre}</b><small>{entidadNombre(db, u.entidadId)} · {areaNombre(db, u.areaId)}</small></span>
                <em>{loaded}</em>
              </button>
            );
          })}
          {!ag.length && <div className="previewEmpty compact"><b>Sin resultados</b><span>Cambie los filtros de búsqueda.</span></div>}
        </aside>
        <section className="reviewDocuments">
          {selectedUser ? (
            <>
              <div className="selectedAffiliateHeader">
                <div><span className="welcomeTag">Afiliado partícipe</span><h3>{selectedUser.nombre}</h3><p>{entidadNombre(db, selectedUser.entidadId)} · {areaNombre(db, selectedUser.areaId)} · {selectedUser.tipo}</p></div>
                <span className="badge">Líder: {usuarioNombre(db, selectedUser.liderId)}</span>
                <button className="btn aiReviewButton" disabled={aiLoading} onClick={analizarConIA}><Bot size={16} /> {aiLoading ? "Analizando soportes…" : "Generar informe con IA"}</button>
              </div>
              {aiReport && <div className={`aiDocumentReport ${aiReport.error ? "error" : ""}`}><b>{aiReport.error ? "No fue posible generar el informe" : `Informe IA · ${aiReport.attached} archivo(s) analizado(s)`}</b><div>{aiReport.error || aiReport.report}</div>{!aiReport.error && <small>Apoyo automatizado. La validación y decisión final corresponde al responsable humano.</small>}</div>}
              <div className="reviewDocumentList">
                {selectedDocs.map((d) => (
                  <button key={d.id} className={`reviewDocumentButton ${d.id === selectedDocId ? "active" : ""}`} onClick={() => selectReviewDocument(d)}>
                    <FileText size={18} />
                    <span><b>{d.nombre}</b><small>{d.archivo ? `${d.archivo.nombre} · ${bytes(d.archivo.tamano)}` : "Pendiente por cargar"}</small></span>
                    <i className={`pill ${d.estado === "Aprobado" ? "ok" : d.estado === "Rechazado" ? "bad" : d.estado === "Devuelto" ? "obs" : d.estado === "Cargado" ? "rev" : "pend"}`}>{d.estado}</i>
                  </button>
                ))}
                {!selectedDocs.length && <div className="previewEmpty compact"><b>Sin documentos</b><span>No hay soportes para el estado seleccionado.</span></div>}
              </div>
            </>
          ) : <div className="previewEmpty"><Users size={52} /><b>Seleccione un afiliado</b><span>Al hacer clic en su nombre aparecerán aquí todos sus documentos.</span></div>}
        </section>
        <aside className="reviewViewer">
          {selectedDoc?.archivo && reviewPreviewUrl ? (
            <>
              <div className="previewHeading"><div><span className="welcomeTag">Documento seleccionado</span><h3>{selectedDoc.nombre}</h3></div><a className="btn ghost" href={selectedDoc.archivo.dataUrl} target="_blank" rel="noreferrer"><Eye size={14} /> Abrir</a></div>
              {selectedDoc.archivo.tipo.startsWith("image/") ? <img className="reviewPreviewFrame" src={reviewPreviewUrl} alt={selectedDoc.archivo.nombre} /> : selectedDoc.archivo.tipo === "application/pdf" || selectedDoc.archivo.nombre.toLowerCase().endsWith(".pdf") ? <iframe className="reviewPreviewFrame" src={reviewPreviewUrl} title={selectedDoc.archivo.nombre} /> : <div className="previewEmpty"><FileText size={52} /><b>{selectedDoc.archivo.nombre}</b><span>Abra el archivo para revisarlo en su visor compatible.</span></div>}
              <p className="obsBox">{selectedDoc.observacion}</p>
              <div className="reviewActions"><button className="btn" onClick={() => cambiar(selectedUser!.id, selectedDoc.id, "Aprobado")}><CheckCircle2 size={15} /> Aprobar</button><button className="btn danger" onClick={() => cambiar(selectedUser!.id, selectedDoc.id, "Rechazado")}><XCircle size={15} /> Rechazar</button><button className="btn obsBtn" onClick={() => cambiar(selectedUser!.id, selectedDoc.id, "Devuelto")}>Devolver</button></div>
            </>
          ) : <div className="previewEmpty"><Eye size={52} /><b>Seleccione un documento cargado</b><span>La previsualización aparecerá aquí mismo.</span></div>}
        </aside>
      </div>
    </div>
  );
}
function MisAgremiados({ db, session }: any) {
  const lista = db.usuarios.filter(
    (u: Usuario) =>
      u.rol === "Agremiado" &&
      (u.liderId === session.id || u.areaId === session.areaId),
  );
  return (
    <div className="card">
      <h3>Mis agremiados asignados</h3>
      <p className="muted">
        El líder institucional solo visualiza datos de ficha técnica y avance
        documental de sus agremiados asignados.
      </p>
      {lista.length === 0 ? (
        <div className="emptyState">
          <Users size={42} />
          <b>No hay agremiados asignados</b>
          <span>
            Cuando un agremiado seleccione esta entidad/área o sea asignado a
            este líder, aparecerá aquí.
          </span>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Agremiado</th>
              <th>Entidad</th>
              <th>Área</th>
              <th>Tipo</th>
              <th>Avance documental</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((u: Usuario) => {
              const docs = db.documentos[u.id] || [];
              const cargados = docs.filter((d: Documento) => d.archivo).length;
              return (
                <tr key={u.id}>
                  <td>
                    <b>{u.nombre}</b>
                    <br />
                    <span className="mini">
                      {u.correo} · {u.cargo || ""}
                    </span>
                  </td>
                  <td>{entidadNombre(db, u.entidadId)}</td>
                  <td>{areaNombre(db, u.areaId)}</td>
                  <td>{u.tipo}</td>
                  <td>
                    <b>
                      {cargados}/{docs.length}
                    </b>
                    <div className="progress small">
                      <i
                        style={{
                          width:
                            (docs.length
                              ? Math.round((cargados / docs.length) * 100)
                              : 0) + "%",
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
const drivePreviewUrl = (url = "") =>
  url.includes("drive.google.com/file/d/")
    ? url.replace(/\/view(?:\?.*)?$/, "/preview")
    : url;

function Informes({ db, session }: any) {
  const [data, setData] = useState<any>({ periods: [], submissions: [] });
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subreportDrafts, setSubreportDrafts] = useState<Record<string, any>>({});
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/agreserge-reports?scope=mine", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setData(payload);
    } catch (e: any) {
      setError(e.message || "No se pudieron cargar sus informes");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  const updateAssignment = async (body: any, successMessage: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/agreserge-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      await load();
      alert(successMessage);
    } catch (e: any) {
      setError(e.message || "No se pudo actualizar el subinforme");
      alert(e.message || "No se pudo actualizar el subinforme");
    } finally {
      setLoading(false);
    }
  };
  const upload = async (id: string, file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      await uploadReportFile(id, file);
      await load();
      alert("Informe guardado correctamente en su carpeta de Google Drive.");
    } catch (e: any) {
      setError(e.message || "No se pudo cargar el informe");
      alert(e.message || "No se pudo cargar el informe");
    } finally {
      setLoading(false);
    }
  };
  const periodById = (id: string) => data.periods.find((period: any) => period.id === id);
  const leaders = db.usuarios.filter((user: Usuario) =>
    user.activo && user.entidadId === session.entidadId &&
    [
      "Líder de Proceso", "Líder Institucional", "Coordinador de Proceso AGRESERGE",
      "Coordinadora Administrativa y Financiera", "Coordinación Administrativa",
      "Coordinación Asistencial", "Coordinación General", "Coordinador General",
    ].includes(user.rol),
  );
  const createSubreport = async (parentId: string) => {
    const draft = subreportDrafts[parentId] || {};
    if (!draft.titulo || !draft.responsableId) {
      return alert("Escriba el nombre del subinforme y seleccione su responsable.");
    }
    await updateAssignment(
      {
        action: "create-subreport",
        parentId,
        titulo: draft.titulo,
        responsableId: draft.responsableId,
        orden: Number(draft.orden || 1),
      },
      "Subinforme creado y asignado. Ya aparece en el portal del responsable.",
    );
    setSubreportDrafts((current) => ({ ...current, [parentId]: {} }));
  };
  return (
    <div className="grid reportWorkspace">
      <div className="card span12 reportHero">
        <div>
          <span className="badge">MIS RESPONSABILIDADES</span>
          <h2>Informes de actividades</h2>
          <p className="muted">
            Aquí aparecen exclusivamente los anexos y subinformes asignados a {session.nombre}.
          </p>
        </div>
        <span className={`pill ${error ? "bad" : "ok"}`}>{error || (loading ? "Sincronizando…" : `${data.submissions.length} asignaciones`)}</span>
      </div>
      <div className="card span12">
        <div className="assignmentStack">
          {data.submissions.map((item: any) => {
            const period = periodById(item.period_id);
            const controlsStructure = item.delegado_por_id === session.id;
            return (
              <article className={`assignmentLine ${item.parent_id ? "subreport" : ""}`} key={item.id}>
                <div className="assignmentOrder">{item.parent_id ? "↳" : item.obligation?.numero || "•"}</div>
                <div className="assignmentInfo">
                  <b>{item.parent_id
                    ? "Subinforme"
                    : item.annex?.numero === 0
                      ? "Soporte directo de la obligación"
                      : `Anexo ${item.annex?.numero || "—"}`} · {item.titulo}</b>
                  <span>
                    Obligación {item.obligation?.numero || "—"} · {period?.mes || "Periodo"} {period?.anio || ""}
                    {" · "}{item.estado}
                  </span>
                  {item.drive_file_url && (
                    <div className="row">
                      <button className="btn" onClick={() => setPreview(item)}><Eye size={14} /> Previsualizar cargue</button>
                      <a href={item.drive_file_url} target="_blank" rel="noreferrer" className="link">
                        <LinkIcon size={14} /> Abrir documento
                      </a>
                    </div>
                  )}
                  {item.drive_folder_url && (
                    <a href={item.drive_folder_url} target="_blank" rel="noreferrer" className="link">
                      <FolderKanban size={14} /> Abrir carpeta del anexo
                    </a>
                  )}
                </div>
                <label className="reportUpload">
                  <span>{item.archivo_nombre ? `Reemplazar ${item.archivo_nombre}` : "Cargar informe o soporte"}</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    disabled={loading}
                    onChange={(e) => upload(item.id, e.target.files?.[0])}
                  />
                </label>
                {controlsStructure && (
                  <div className="assignmentActions leaderStructureControls">
                    <span className="mini">Organizar subinforme</span>
                    <select
                      value={item.responsable_id || ""}
                      disabled={loading}
                      onChange={(e) => updateAssignment(
                        { action: "delegate", id: item.id, responsableId: e.target.value },
                        "Responsable del subinforme actualizado.",
                      )}
                    >
                      {leaders.map((user: Usuario) => (
                        <option key={user.id} value={user.id}>{user.nombre}</option>
                      ))}
                    </select>
                    <label>
                      <span className="mini">Orden</span>
                      <input
                        className="input orderInput"
                        type="number"
                        min="1"
                        defaultValue={item.orden}
                        disabled={loading}
                        onBlur={(e) => updateAssignment(
                          { action: "reorder", id: item.id, orden: Number(e.target.value) },
                          "Orden del subinforme guardado.",
                        )}
                      />
                    </label>
                  </div>
                )}
                {!item.parent_id && item.responsable_id === session.id && (
                  <div className="subreportCreator">
                    <b>Agregar un subinforme a este anexo</b>
                    <input
                      className="input"
                      placeholder="Área o nombre del subinforme"
                      value={subreportDrafts[item.id]?.titulo || ""}
                      onChange={(e) => setSubreportDrafts((current) => ({
                        ...current,
                        [item.id]: { ...current[item.id], titulo: e.target.value },
                      }))}
                    />
                    <select
                      value={subreportDrafts[item.id]?.responsableId || ""}
                      onChange={(e) => setSubreportDrafts((current) => ({
                        ...current,
                        [item.id]: { ...current[item.id], responsableId: e.target.value },
                      }))}
                    >
                      <option value="">Seleccionar responsable</option>
                      {leaders.map((user: Usuario) => (
                        <option key={user.id} value={user.id}>{user.nombre} · {user.cargo || user.rol}</option>
                      ))}
                    </select>
                    <input
                      className="input orderInput"
                      type="number"
                      min="1"
                      placeholder="Orden"
                      value={subreportDrafts[item.id]?.orden || ""}
                      onChange={(e) => setSubreportDrafts((current) => ({
                        ...current,
                        [item.id]: { ...current[item.id], orden: e.target.value },
                      }))}
                    />
                    <button className="btn primary" disabled={loading} onClick={() => createSubreport(item.id)}>
                      Crear y delegar
                    </button>
                  </div>
                )}
              </article>
            );
          })}
          {!loading && !data.submissions.length && (
            <div className="emptyState">
              <FileText size={42} />
              <b>No tiene informes asignados</b>
              <span>Cuando un coordinador le asigne un anexo o subinforme, aparecerá aquí automáticamente.</span>
            </div>
          )}
        </div>
      </div>
      {preview && (
        <div className="previewOverlay" onClick={() => setPreview(null)}>
          <div className="previewModal" onClick={(event) => event.stopPropagation()}>
            <div className="sectionTitleRow"><div><span className="badge">VISTA PREVIA</span><h3>{preview.archivo_nombre || preview.titulo}</h3></div><button className="btn" onClick={() => setPreview(null)}>Cerrar</button></div>
            <iframe className="documentFrame" title="Documento del informe" src={drivePreviewUrl(preview.drive_file_url)} />
          </div>
        </div>
      )}
    </div>
  );
}

function InformesLegacy({ db, save, session }: any) {
  const limited = [
    "Líder Institucional",
    "Líder de Proceso",
    "Coordinador de Proceso AGRESERGE",
  ].includes(session.rol);
  const visibles = limited
    ? db.asignacionesMensuales.filter(
        (a: Asignacion) =>
          a.responsableId === session.id || a.coordinadorId === session.id,
      )
    : db.asignacionesMensuales;
  const canDelegate = [
    "Coordinador de Proceso AGRESERGE",
    "Coordinadora Administrativa y Financiera",
    "Coordinación Administrativa",
    "Coordinación Asistencial",
    "Coordinación General",
    "Director Ejecutivo",
    "Administrador de Sistemas",
  ].includes(session.rol);
  const leaders = db.usuarios.filter(
    (u: Usuario) =>
      u.activo && ["Líder Institucional", "Líder de Proceso"].includes(u.rol),
  );
  const delegar = (assignment: Asignacion, responsableId: string) => {
    if (!responsableId) return;
    const asignacionesMensuales = db.asignacionesMensuales.map(
      (item: Asignacion) =>
        item.id === assignment.id
          ? {
              ...item,
              coordinadorId: assignment.coordinadorId || session.id,
              responsableId,
              estado: "Asignado",
            }
          : item,
    );
    save(
      { ...db, asignacionesMensuales },
      `Informe Anexo ${assignment.anexo} delegado a ${usuarioNombre(db, responsableId)}`,
    );
  };
  const cargar = async (a: Asignacion, file?: File) => {
    if (!file) return;
    const ar = await leerArchivo(file);
    const fecha = hoy();
    const n = db.asignacionesMensuales.map((x: Asignacion) =>
      x.id === a.id
        ? {
            ...x,
            archivo: ar,
            fechaCarga: fecha,
            estado: fecha > x.fechaLimite ? "Extemporáneo" : "Cargado",
            notificarEstadistica: fecha > x.fechaLimite,
          }
        : x,
    );
    save(
      { ...db, asignacionesMensuales: n },
      `Informe cargado: Anexo ${a.anexo}`,
    );
    if (fecha > a.fechaLimite)
      alert("Cargue extemporáneo. Se genera alerta para Estadística.");
  };
  return (
    <div className="card">
      <h3>
        {session.rol === "Líder Institucional"
          ? "Mis informes asignados"
          : "Informes de actividades"}
      </h3>
      <p className="muted">
        Cada coordinador recibe su copia mensual y puede delegar componentes a
        líderes de área. La trazabilidad conserva al coordinador y al
        responsable actual para consolidar el informe final.
      </p>
      {visibles.length === 0 ? (
        <div className="emptyState">
          <FileText size={42} />
          <b>No hay informes asignados todavía</b>
          <span>
            Cuando el Coordinador General o el área administrativa genere el mes
            y asigne el anexo, aparecerá aquí automáticamente para el líder
            responsable.
          </span>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Anexo</th>
              <th>Responsable</th>
              <th>Periodo</th>
              <th>Google Docs / archivo</th>
              <th>Límite</th>
              <th>Estado</th>
              {canDelegate && <th>Delegar</th>}
              <th>Cargar</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((a: Asignacion) => (
              <tr key={a.id}>
                <td>
                  <b>Anexo {a.anexo}</b>
                  <br />
                  <span className="mini">{a.titulo}</span>
                </td>
                <td>{usuarioNombre(db, a.responsableId)}</td>
                <td>
                  {a.mes} {a.anio}
                </td>
                {canDelegate && (
                  <td>
                    <select
                      value={a.responsableId}
                      onChange={(e) => delegar(a, e.target.value)}
                    >
                      <option value={a.responsableId}>
                        {usuarioNombre(db, a.responsableId)}
                      </option>
                      {leaders
                        .filter(
                          (leader: Usuario) => leader.id !== a.responsableId,
                        )
                        .map((leader: Usuario) => (
                          <option key={leader.id} value={leader.id}>
                            {leader.nombre}
                          </option>
                        ))}
                    </select>
                  </td>
                )}
                <td>
                  <a
                    className="link"
                    href={a.copiaGoogle || a.plantillaGoogle}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <LinkIcon size={14} /> Abrir informe asignado
                  </a>
                  <br />
                  <a
                    className="link"
                    href={a.hojaGoogle || "#"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <LinkIcon size={14} /> Hoja de control
                  </a>
                  <br />
                  <span className="mini">
                    {a.archivo?.nombre || "Sin archivo cargado"}
                  </span>
                </td>
                <td>{a.fechaLimite}</td>
                <td>
                  <span
                    className={`pill ${estadoInforme(a) === "Extemporáneo" ? "bad" : estadoInforme(a) === "Aprobado" ? "ok" : "rev"}`}
                  >
                    {estadoInforme(a)}
                  </span>
                </td>
                <td>
                  <input
                    type="file"
                    className="input"
                    onChange={(e) => cargar(a, e.target.files?.[0])}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
function AsignacionMensual({ db, session }: any) {
  const [data, setData] = useState<any>({ periods: [], obligations: [], annexes: [], submissions: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ entidadId: "hgc", mes: meses[new Date().getMonth()], anio: String(new Date().getFullYear()), fechaLimite: "" });
  const managers = [
    "Administrador de Sistemas", "Coordinación AGRESERGE", "Coordinación General",
    "Coordinador General", "Director Ejecutivo", "Coordinadora Administrativa y Financiera",
    "Coordinación Administrativa", "Coordinación Asistencial",
  ];
  const isManager = managers.includes(session.rol);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/agreserge-reports", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setData(payload);
    } catch (e: any) {
      setError(e.message || "No se pudieron cargar los informes");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);
  const action = async (body: any, message?: string) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/agreserge-reports", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      if (message) alert(message);
      await load();
      return payload;
    } catch (e: any) {
      setError(e.message || "No se pudo completar la acción");
      alert(e.message || "No se pudo completar la acción");
    } finally {
      setLoading(false);
    }
  };
  const assignAnnex = async (annexId: string, responsableId: string) => {
    if (!responsableId) return;
    setData((current: any) => ({
      ...current,
      annexes: current.annexes.map((annex: any) =>
        annex.id === annexId ? { ...annex, responsable_id: responsableId } : annex),
      submissions: current.submissions.map((submission: any) =>
        submission.annex_id === annexId && !submission.parent_id
          ? { ...submission, responsable_id: responsableId, delegado_por_id: session.id }
          : submission),
    }));
    await action(
      { action: "assign-annex", annexId, responsableId },
      "Responsable guardado. La asignación ya aparece en el portal de esa persona.",
    );
  };
  const changeOrder = async (kind: "obligation" | "annex", id: string, orden: number) => {
    if (!Number.isFinite(orden) || orden < 1) return;
    const key = kind === "obligation" ? "obligations" : "annexes";
    setData((current: any) => ({
      ...current,
      [key]: current[key].map((item: any) => item.id === id ? { ...item, orden } : item),
    }));
    await action({ action: `reorder-${kind}`, id, orden });
  };
  const bootstrap = () => action(
    { action: "bootstrap-entity", entidadId: form.entidadId },
    "Entidad parametrizada con sus obligaciones y anexos contractuales.",
  );
  const reset = () => {
    if (confirm("Se eliminará el historial de meses abiertos del Hospital Gonzalo Contreras. Las cuentas y la parametrización se conservarán. ¿Continuar?"))
      action({ action: "reset-periods", entidadId: form.entidadId }, "Periodos anteriores eliminados. Puede comenzar desde cero.");
  };
  const open = async () => {
    if (!form.mes || !form.anio) return alert("Seleccione mes y año.");
    const payload = await action({ action: "open-period", ...form });
    if (payload?.folderUrl) window.open(payload.folderUrl, "_blank", "noopener,noreferrer");
  };
  const close = async (periodId: string) => {
    if (!confirm("¿Cerrar el mes y generar el informe consolidado editable?")) return;
    const payload = await action({ action: "close-period", periodId });
    if (payload?.pdfFolderUrl) window.open(payload.pdfFolderUrl, "_blank", "noopener,noreferrer");
    else if (payload?.url) window.open(payload.url, "_blank", "noopener,noreferrer");
  };
  const syncPeriod = async (periodId: string) => {
    const payload = await action(
      { action: "sync-period", periodId },
      "Periodo sincronizado. Los responsables ya pueden ver, editar y cargar sus informes.",
    );
    if (payload?.folderUrl) window.open(payload.folderUrl, "_blank", "noopener,noreferrer");
  };
  const upload = async (id: string, file?: File) => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      await uploadReportFile(id, file);
      await load();
      alert("Informe cargado y guardado en la carpeta correcta de Google Drive.");
    } catch (e: any) {
      setError(e.message || "No se pudo cargar el archivo");
      alert(e.message || "No se pudo cargar el archivo");
    } finally {
      setLoading(false);
    }
  };
  const selectedPeriod = data.periods.find((period: any) => period.entidad_id === form.entidadId);
  const visibleSubmissions = selectedPeriod
    ? data.submissions.filter((item: any) => item.period_id === selectedPeriod.id)
    : data.submissions;
  const assignableUsers = db.usuarios.filter((user: Usuario) =>
    user.activo && [
      "Administrador de Sistemas", "Coordinación AGRESERGE", "Coordinación General",
      "Coordinador General", "Director Ejecutivo", "Coordinadora Administrativa y Financiera",
      "Coordinación Administrativa", "Coordinación Asistencial",
      "Coordinador de Proceso AGRESERGE", "Líder Institucional", "Líder de Proceso",
      "Asesora de Calidad", "Seguridad y Salud en el Trabajo", "Talento Humano",
      "Experiencia al Agremiado", "Tesorería",
    ].includes(user.rol),
  );
  return (
    <div className="grid reportWorkspace">
      <div className="card span12 reportHero">
        <div>
          <span className="badge">INFORMES MENSUALES POR HOSPITAL</span>
          <h2>Centro de ejecución contractual</h2>
          <p className="muted">24 obligaciones, 27 anexos, delegación por líder, orden controlado, carpetas de Drive y cierre consolidado editable.</p>
        </div>
        <span className={`pill ${error ? "bad" : "ok"}`}>{error || (loading ? "Sincronizando…" : "Base de informes conectada")}</span>
      </div>
      {isManager && (
        <div className="card span12">
          <div className="reportToolbar">
            <div className="field">
              <label>Hospital o entidad</label>
              <select value={form.entidadId} onChange={(e) => setForm({ ...form, entidadId: e.target.value })}>
                {db.entidades.map((entity: Entidad) => <option key={entity.id} value={entity.id}>{entity.nombre}</option>)}
              </select>
            </div>
            <div className="field"><label>Mes</label><select value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })}>{meses.map((month) => <option key={month}>{month}</option>)}</select></div>
            <div className="field"><label>Año</label><input className="input" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></div>
            <div className="field"><label>Fecha límite</label><input className="input" type="date" value={form.fechaLimite} onChange={(e) => setForm({ ...form, fechaLimite: e.target.value })} /></div>
          </div>
          <div className="row">
            <button className="btn" disabled={loading} onClick={bootstrap}>Parametrizar entidad seleccionada</button>
            <button className="btn primary" disabled={loading} onClick={open}>Abrir mes y crear carpetas</button>
            <button className="btn danger" disabled={loading} onClick={reset}>Reiniciar meses abiertos</button>
          </div>
        </div>
      )}
      {isManager && data.obligations.length > 0 && (
        <div className="card span12">
          <div className="sectionTitleRow">
            <div>
              <span className="badge">PARAMETRIZACIÓN MANUAL</span>
              <h3>Responsable de cada anexo por obligación contractual</h3>
              <p className="muted">
                Esta asignación se utiliza al abrir el siguiente mes. Cada líder verá únicamente
                los anexos que tenga asignados.
              </p>
            </div>
          </div>
          <div className="obligationAssignmentList">
            {data.obligations.filter((obligation: any) => obligation.entidad_id === form.entidadId).map((obligation: any) => {
              const annexes = data.annexes.filter((annex: any) => annex.obligation_id === obligation.id);
              return (
                <section className="obligationAssignmentCard" key={obligation.id}>
                  <div className="obligationHeading">
                    <span className="assignmentOrder">{obligation.numero}</span>
                    <div>
                      <b>Obligación contractual {obligation.numero}</b>
                      <p>{obligation.titulo}</p>
                    </div>
                    <label className="structureOrder">
                      <span>Orden en informe</span>
                      <input
                        className="input orderInput"
                        type="number"
                        min="1"
                        value={obligation.orden}
                        disabled={loading}
                        onChange={(e) => setData((current: any) => ({
                          ...current,
                          obligations: current.obligations.map((item: any) =>
                            item.id === obligation.id ? { ...item, orden: Number(e.target.value) } : item),
                        }))}
                        onBlur={(e) => changeOrder("obligation", obligation.id, Number(e.target.value))}
                      />
                    </label>
                  </div>
                  {annexes.length ? (
                    <div className="annexAssignmentRows">
                      {annexes.map((annex: any) => (
                        <div className="annexAssignmentRow" key={annex.id}>
                          <div>
                            <b>{reportAnnexLabel(form.entidadId, annex)}</b>
                            <span>{annex.titulo}</span>
                          </div>
                          <label>
                            <span>Responsable</span>
                            <select
                              value={annex.responsable_id || ""}
                              disabled={loading}
                              onChange={(e) => assignAnnex(annex.id, e.target.value)}
                            >
                              <option value="">Seleccionar responsable</option>
                              {assignableUsers.map((user: Usuario) => (
                                <option key={user.id} value={user.id}>
                                  {user.nombre} · {user.rol}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="structureOrder">
                            <span>Orden del anexo</span>
                            <input
                              className="input orderInput"
                              type="number"
                              min="1"
                              value={annex.orden}
                              disabled={loading}
                              onChange={(e) => setData((current: any) => ({
                                ...current,
                                annexes: current.annexes.map((item: any) =>
                                  item.id === annex.id ? { ...item, orden: Number(e.target.value) } : item),
                              }))}
                              onBlur={(e) => changeOrder("annex", annex.id, Number(e.target.value))}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mini">Esta obligación lleva portada y soporte directo en PDF o Word, sin anexo numerado.</p>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
      <div className="card span4">
        <h3>Historial mensual</h3>
        <div className="periodStack">
          {data.periods.map((period: any) => (
            <div className="periodCard" key={period.id}>
              <b>{period.entity?.nombre || "Hospital"}</b>
              <span>{period.mes} {period.anio}</span>
              <span className={`pill ${period.estado === "Cerrado" ? "ok" : "warn"}`}>{period.estado}</span>
              <div className="row">
                {period.drive_folder_url && <a className="btn" href={period.drive_folder_url} target="_blank">Carpeta Drive</a>}
                {period.estado !== "Cerrado" && isManager && (
                  <button className="btn" disabled={loading} onClick={() => syncPeriod(period.id)}>
                    Sincronizar responsables
                  </button>
                )}
                {period.estado !== "Cerrado" && isManager && <button className="btn primary" onClick={() => close(period.id)}>Cerrar y consolidar</button>}
                {period.consolidated_doc_url && <a className="btn primary" href={period.consolidated_doc_url} target="_blank">Informe editable</a>}
              </div>
            </div>
          ))}
          {!data.periods.length && <p className="muted">No hay meses abiertos. Parametrice una entidad y abra el primer periodo.</p>}
        </div>
      </div>
      <div className="card span8">
        <h3>{isManager ? "Obligaciones, anexos y responsables" : "Mis anexos asignados"}</h3>
        <p className="muted">Cada persona visualiza únicamente los informes que le fueron asignados. Los subinformes mantienen el orden definido por su coordinador.</p>
        <div className="assignmentStack">
          {visibleSubmissions.map((item: any) => {
            const responsible = db.usuarios.find((user: Usuario) => user.id === item.responsable_id);
            const canDelegate = isManager || item.responsable_id === session.id;
            return (
              <article className={`assignmentLine ${item.parent_id ? "subreport" : ""}`} key={item.id}>
                <div className="assignmentOrder">{item.parent_id ? "↳" : item.obligation?.numero || "•"}</div>
                <div className="assignmentInfo">
                  <b>{item.titulo}</b>
                  <span>{responsible?.nombre || "Sin responsable"} · {item.estado}</span>
                  {item.drive_file_url && <a href={item.drive_file_url} target="_blank" className="link">Abrir y diligenciar en Drive</a>}
                  {(item.responsable_id === session.id || isManager) && (
                    <label className="reportUpload">
                      <span>Cargar PDF, Word, Excel o imagen</span>
                      <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onChange={(e) => upload(item.id, e.target.files?.[0])} />
                    </label>
                  )}
                </div>
                {canDelegate && (
                  <div className="assignmentActions">
                    <select value={item.responsable_id || ""} onChange={(e) => action({ action: "delegate", id: item.id, responsableId: e.target.value })}>
                      <option value="">Asignar responsable</option>
                      {db.usuarios.filter((user: Usuario) => user.activo && user.entidadId === "hgc").map((user: Usuario) => <option key={user.id} value={user.id}>{user.nombre}</option>)}
                    </select>
                    <input className="input orderInput" type="number" value={item.orden} onChange={(e) => action({ action: "reorder", id: item.id, orden: e.target.value })} aria-label="Orden" />
                  </div>
                )}
              </article>
            );
          })}
          {!visibleSubmissions.length && <p className="muted">Todavía no hay anexos asignados para este periodo.</p>}
        </div>
      </div>
    </div>
  );
}

function AsignacionMensualLegacy({ db, save, session }: any) {
  const [f, setF] = useState<any>({
    mes: "Enero",
    anio: "2026",
    plantillaGoogle: "",
    hojaGoogle: "",
    fechaLimite: "2026-01-14",
  });
  const [generando, setGenerando] = useState(false);
  const [carpetaMes, setCarpetaMes] = useState("");
  const responsables = db.usuarios.filter((u: Usuario) =>
    [
      "Líder Institucional",
      "Líder de Proceso",
      "Coordinador de Proceso AGRESERGE",
      "Coordinadora Administrativa y Financiera",
      "Coordinación Administrativa",
      "Coordinación Asistencial",
      "Coordinación General",
      "Asesora de Calidad",
      "Seguridad y Salud en el Trabajo",
    ].includes(u.rol),
  );
  const crearBase = () => {
    if (
      db.asignacionesBase.some((a: Asignacion) => a.anexo === Number(f.anexo))
    )
      return alert(
        "Este anexo ya tiene asignación base. Solo se permite una vez; si cambia el líder, modifique el responsable.",
      );
    const an = anexos.find((a) => a[0] === Number(f.anexo));
    if (!an || !f.responsableId) return alert("Seleccione anexo y responsable");
    const base: any = {
      id: uid(),
      anexo: Number(an[0]),
      titulo: String(an[1]),
      tipo: an[2] as any,
      responsableId: f.responsableId,
      coordinadorId: session.id,
      mes: f.mes,
      anio: f.anio,
      plantillaGoogle: driveTemplate(Number(an[0]))?.url || "",
      hojaGoogle: f.hojaGoogle,
      copiaGoogle: "",
      fechaLimite: f.fechaLimite,
      estado: "Asignado",
      notificarEstadistica: false,
    };
    save(
      { ...db, asignacionesBase: [...db.asignacionesBase, base] },
      `Asignación base creada: Anexo ${base.anexo}`,
    );
  };
  const generarMes = async () => {
    if (!db.asignacionesBase.length)
      return alert("Primero asigne al menos un formato a un responsable.");
    setGenerando(true);
    try {
      const payload = await openRemoteDrivePeriod({
        mes: f.mes,
        anio: f.anio,
        fechaLimite: f.fechaLimite,
        assignments: db.asignacionesBase
          .filter((b: any) => b.anexo <= 24)
          .map((b: any) => ({
            anexo: b.anexo,
            responsableId: b.responsableId,
          })),
      });
      setCarpetaMes(payload.folderUrl || "");
      if (payload.db)
        save(payload.db, `Periodo de Drive creado: ${f.mes} ${f.anio}`);
      alert(`Periodo ${f.mes} ${f.anio} creado correctamente en Google Drive.`);
    } catch (e: any) {
      alert(e.message || "No se pudo crear el periodo en Drive");
    } finally {
      setGenerando(false);
    }
  };
  const notificar = () => {
    alert(
      "Notificación día 14 simulada: responsables informados por correo. En producción se conecta SMTP/API Gmail.",
    );
    save(db, `Recordatorio día 14 generado para ${f.mes} ${f.anio}`);
  };
  const final = () => {
    const lineas = [
      "ANEXO,COORDINADOR,RESPONSABLE,MES,AÑO,ESTADO,FECHA_CARGA,GOOGLE_DOCS,GOOGLE_SHEETS",
      ...db.asignacionesMensuales.map(
        (a: any) =>
          `${a.anexo},"${usuarioNombre(db, a.coordinadorId)}","${usuarioNombre(db, a.responsableId)}",${a.mes},${a.anio},${estadoInforme(a)},${a.fechaCarga || ""},"${a.copiaGoogle || a.plantillaGoogle}","${a.hojaGoogle || f.hojaGoogle}"`,
      ),
    ];
    const blob = new Blob([lineas.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `informe_final_google_sheets_${hoy()}.csv`;
    a.click();
  };
  return (
    <div className="grid">
      <div className="card span12">
        <h3>Asignación maestra por coordinador e informe</h3>
        <div className="grid">
          <div className="span3 field">
            <label>Anexo</label>
            <select onChange={(e) => setF({ ...f, anexo: e.target.value })}>
              <option>Seleccione</option>
              {anexos.slice(0, 24).map((a) => (
                <option key={a[0]} value={a[0]}>
                  Anexo {a[0]} - {a[1]}
                </option>
              ))}
            </select>
          </div>
          <div className="span3 field">
            <label>Coordinador responsable</label>
            <select
              onChange={(e) => setF({ ...f, responsableId: e.target.value })}
            >
              <option>Seleccione</option>
              {responsables.map((u: Usuario) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="span6 field">
            <label>Formato maestro en Drive</label>
            <input
              className="input"
              readOnly
              value={
                f.anexo
                  ? driveTemplate(Number(f.anexo))?.url ||
                    "Formato no disponible"
                  : "Seleccione un formato del 1 al 24"
              }
            />
          </div>
        </div>
        <button className="btn primary" onClick={crearBase}>
          Guardar asignación base
        </button>
      </div>
      <div className="card span12">
        <h3>Generar nuevo mes, links e informe final</h3>
        <div className="row">
          <select
            value={f.mes}
            onChange={(e) => setF({ ...f, mes: e.target.value })}
          >
            {meses.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <input
            className="input"
            style={{ maxWidth: 160 }}
            value={f.anio}
            onChange={(e) => setF({ ...f, anio: e.target.value })}
          />
          <input
            className="input"
            style={{ maxWidth: 190 }}
            type="date"
            value={f.fechaLimite}
            onChange={(e) => setF({ ...f, fechaLimite: e.target.value })}
          />
          <button
            className="btn primary"
            disabled={generando}
            onClick={generarMes}
          >
            {generando
              ? "Creando copias en Drive..."
              : "Crear mes y duplicar formatos"}
          </button>
          <button className="btn" onClick={notificar}>
            <Mail size={14} /> Simular correo día 14
          </button>
          <button className="btn" onClick={final}>
            <Download size={14} /> Generar informe final CSV
          </button>
        </div>
        {carpetaMes && (
          <p>
            <a className="link" href={carpetaMes} target="_blank">
              Abrir carpeta mensual en Google Drive
            </a>
          </p>
        )}
        <p className="muted">
          <Mail size={14} /> El link de apertura del informe queda funcional
          como enlace; la copia mensual queda lista por anexo y responsable.
        </p>
      </div>
      <div className="card span12">
        <h3>Asignaciones base existentes</h3>
        <table className="table">
          <tbody>
            {db.asignacionesBase.map((a: any) => (
              <tr key={a.id}>
                <td>Anexo {a.anexo}</td>
                <td>{a.titulo}</td>
                <td>{usuarioNombre(db, a.responsableId)}</td>
                <td>
                  <a className="link" href={a.plantillaGoogle} target="_blank">
                    Google Docs
                  </a>
                </td>
                <td>
                  <a
                    className="link"
                    href={a.hojaGoogle || f.hojaGoogle}
                    target="_blank"
                  >
                    Google Sheets
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TramitesAdministrativos({ session, db, save }: any) {
  const agremiados = db.usuarios.filter((u: Usuario) => u.rol === "Agremiado");
  const esCoord =
    session.rol === "Coordinadora Administrativa y Financiera" ||
    session.rol === "Coordinador General" ||
    session.rol === "Gerente";
  const lista = (db.tramites || []).filter(
    (t: Tramite) => esCoord || t.agremiadoId === session.id,
  );
  const [f, setF] = useState<any>({
    agremiadoId:
      session.rol === "Agremiado" ? session.id : agremiados[0]?.id || "",
    tipo: "Carta laboral",
    periodo: hoy().slice(0, 7),
    fuenteGoogle:
      "https://docs.google.com/spreadsheets/d/BASE_NOMINA_AGRESERGE",
  });
  const genTxt = (t: any, u: Usuario) =>
    `PORTAL AGRESERGE\n${t.tipo.toUpperCase()}\n\nAfiliado partícipe: ${u.nombre}\nDocumento generado: ${new Date().toLocaleString()}\nEntidad: ${entidadNombre(db, u.entidadId)}\nÁrea o servicio: ${areaNombre(db, u.areaId)}\nProceso: ${u.cargo || "No registrado"}\nPeriodo: ${t.periodo}\nFuente base: ${t.fuenteGoogle}\n\nLa Coordinación Administrativa y Financiera certifica que el presente trámite fue generado digitalmente desde el Portal AGRESERGE con base en la información parametrizada y la hoja de cálculo de Google indicada.\n\nEstado: GENERADO\n`;
  const generar = () => {
    const u = agremiados.find((x: Usuario) => x.id === f.agremiadoId);
    if (!u) return alert("Seleccione agremiado");
    const txt = genTxt(f, u);
    const archivo = {
      nombre: `${f.tipo.replaceAll(" ", "_")}_${u.nombre.replaceAll(" ", "_")}_${f.periodo}.txt`,
      tipo: "text/plain",
      tamano: txt.length,
      dataUrl:
        "data:text/plain;base64," + btoa(unescape(encodeURIComponent(txt))),
      fecha: hoy(),
    };
    const t: Tramite = {
      id: uid(),
      agremiadoId: u.id,
      tipo: f.tipo,
      periodo: f.periodo,
      estado: "Generado",
      fuenteGoogle: f.fuenteGoogle,
      archivo,
      generado: new Date().toLocaleString(),
      observacion: f.observacion || "Trámite digital generado instantáneamente",
    };
    save(
      { ...db, tramites: [...(db.tramites || []), t] },
      `Trámite generado: ${t.tipo} para ${u.nombre}`,
    );
  };
  const solicitar = () => {
    const t: Tramite = {
      id: uid(),
      agremiadoId: session.id,
      tipo: f.tipo,
      periodo: f.periodo,
      estado: "Solicitado",
      fuenteGoogle: f.fuenteGoogle,
      generado: new Date().toLocaleString(),
      observacion: f.observacion || "Solicitud radicada por el agremiado",
    };
    save(
      { ...db, tramites: [...(db.tramites || []), t] },
      `Solicitud de trámite radicada: ${t.tipo}`,
    );
  };
  const exportar = () => {
    const filas = [
      "Agremiado,Entidad,Area,Tipo,Periodo,Estado,FechaGenerado,FuenteGoogle,Observacion",
      ...lista.map((t: Tramite) => {
        const u = db.usuarios.find((x: Usuario) => x.id === t.agremiadoId);
        return `"${u?.nombre || ""}","${entidadNombre(db, u?.entidadId)}","${areaNombre(db, u?.areaId)}","${t.tipo}","${t.periodo}","${t.estado}","${t.generado}","${t.fuenteGoogle}","${(t.observacion || "").replace(/"/g, '""')}"`;
      }),
    ];
    const blob = new Blob([filas.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tramites_agremiados_google_sheets_${hoy()}.csv`;
    a.click();
  };
  const entregar = (t: Tramite) =>
    save(
      {
        ...db,
        tramites: (db.tramites || []).map((x: Tramite) =>
          x.id === t.id ? { ...x, estado: "Entregado" } : x,
        ),
      },
      `Trámite entregado al agremiado: ${t.tipo}`,
    );
  const descargar = (a?: ArchivoLocal) => {
    if (!a) return alert("El trámite aún no tiene archivo generado");
    const link = document.createElement("a");
    link.href = a.dataUrl;
    link.download = a.nombre;
    link.click();
  };
  return (
    <div className="grid">
      <div className="welcomeCard span12">
        <div>
          <span className="welcomeTag">Coordinación administrativa</span>
          <h2>Trámites digitales del agremiado</h2>
          <p>
            Cartas laborales, comprobantes de nómina, comprobantes de pago,
            certificados, paz y salvo y trámites de agremiación. Funciona en
            base local y deja CSV listo para importar o sincronizar con Google
            Sheets.
          </p>
        </div>
        <div className="welcomeLogo">
          <FileText size={54} />
        </div>
      </div>
      <div className="card span4">
        <h3>{esCoord ? "Generar trámite instantáneo" : "Solicitar trámite"}</h3>
        {esCoord && (
          <div className="field">
            <label>Agremiado</label>
            <select
              value={f.agremiadoId}
              onChange={(e) => setF({ ...f, agremiadoId: e.target.value })}
            >
              {agremiados.map((u: Usuario) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} · {entidadNombre(db, u.entidadId)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label>Tipo de trámite</label>
          <select
            value={f.tipo}
            onChange={(e) => setF({ ...f, tipo: e.target.value })}
          >
            <option>Carta laboral</option>
            <option>Comprobante de nómina</option>
            <option>Comprobante de pago</option>
            <option>Certificado de afiliación</option>
            <option>Paz y salvo</option>
            <option>Otro trámite</option>
          </select>
        </div>
        <div className="field">
          <label>Periodo</label>
          <input
            className="input"
            value={f.periodo}
            onChange={(e) => setF({ ...f, periodo: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Base Google Sheets / Excel</label>
          <input
            className="input"
            value={f.fuenteGoogle}
            onChange={(e) => setF({ ...f, fuenteGoogle: e.target.value })}
          />
        </div>
        <textarea
          className="input"
          rows={3}
          placeholder="Observación del trámite"
          onChange={(e) => setF({ ...f, observacion: e.target.value })}
        />
        <button className="btn primary" onClick={esCoord ? generar : solicitar}>
          {esCoord
            ? "Generar reporte al agremiado"
            : "Radicar solicitud digital"}
        </button>
      </div>
      <div className="card span8">
        <div className="row between">
          <h3>Bandeja digital de trámites</h3>
          <button className="btn" onClick={exportar}>
            <Download size={14} /> Exportar CSV Google Sheets
          </button>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Agremiado</th>
              <th>Trámite</th>
              <th>Periodo</th>
              <th>Estado</th>
              <th>Fuente</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((t: Tramite) => {
              const u = db.usuarios.find(
                (x: Usuario) => x.id === t.agremiadoId,
              );
              return (
                <tr key={t.id}>
                  <td>
                    <b>{u?.nombre}</b>
                    <br />
                    <span className="mini">
                      {entidadNombre(db, u?.entidadId)} ·{" "}
                      {areaNombre(db, u?.areaId)}
                    </span>
                  </td>
                  <td>
                    {t.tipo}
                    <br />
                    <span className="mini">{t.generado}</span>
                  </td>
                  <td>{t.periodo}</td>
                  <td>
                    <span
                      className={`pill ${t.estado === "Entregado" ? "ok" : t.estado === "Generado" ? "rev" : "bad"}`}
                    >
                      {t.estado}
                    </span>
                  </td>
                  <td>
                    <a className="link" href={t.fuenteGoogle} target="_blank">
                      Google Sheets
                    </a>
                  </td>
                  <td>
                    <button
                      className="btn"
                      onClick={() => descargar(t.archivo)}
                    >
                      <Download size={14} /> Descargar
                    </button>
                    {esCoord && (
                      <button className="btn" onClick={() => entregar(t)}>
                        <CheckCircle2 size={14} /> Entregar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="card span12">
        <h3>Flujo digital incluido</h3>
        <div className="moduleGrid">
          <div className="moduleMini">
            <FileText /> Carta laboral automática
          </div>
          <div className="moduleMini">
            <FileText /> Comprobante de nómina
          </div>
          <div className="moduleMini">
            <FileText /> Comprobante de pago
          </div>
          <div className="moduleMini">
            <Upload /> Solicitudes digitales
          </div>
          <div className="moduleMini">
            <Download /> Reporte CSV para Google Sheets
          </div>
          <div className="moduleMini">
            <CheckCircle2 /> Entrega instantánea
          </div>
        </div>
      </div>
    </div>
  );
}

function Permisos({ db, save }: any) {
  const toggle = (rol: Rol, m: string) => {
    const actual = db.permisos[rol] || [];
    const nuevo = actual.includes(m)
      ? actual.filter((x) => x !== m)
      : [...actual, m];
    save(
      { ...db, permisos: { ...db.permisos, [rol]: nuevo } },
      `Permisos actualizados para ${rol}`,
    );
  };
  return (
    <div className="card">
      <h3>
        <UserCog size={20} /> Perfiles y funciones habilitadas
      </h3>
      <p className="muted">
        Permite habilitar/deshabilitar accesos mediante lista de chequeo por
        tipo de perfil.
      </p>
      <table className="table">
        <tbody>
          {roles.map((r) => (
            <tr key={r}>
              <td>
                <b>{r}</b>
              </td>
              <td>
                {modulos.map((m) => (
                  <label key={m} className="check">
                    <input
                      type="checkbox"
                      checked={(db.permisos[r] || []).includes(m)}
                      onChange={() => toggle(r, m)}
                    />{" "}
                    {m}
                  </label>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Usuarios({ db, save }: any) {
  const [p, setP] = useState<any>({
    rol: "Agremiado",
    tipo: "Asistencial",
    activo: true,
  });
  const add = () => {
    if (!p.nombre || !p.usuario || !p.correo)
      return alert("Digite nombre, usuario y correo");
    const nuevo = { id: uid(), clave: p.clave || "Cambiar2026!", ...p };
    let docs = db.documentos;
    if (nuevo.rol === "Agremiado")
      docs = { ...docs, [nuevo.id]: soportes(nuevo.tipo, nuevo.id) };
    save(
      { ...db, usuarios: [...db.usuarios, nuevo], documentos: docs },
      `Usuario creado: ${p.nombre}`,
    );
  };
  const reset = (u: Usuario) => {
    const clave = prompt("Nueva contraseña para " + u.nombre);
    if (!clave || clave.length < 8)
      return alert("La contraseña debe tener al menos 8 caracteres.");
    save(
      {
        ...db,
        usuarios: db.usuarios.map((x: Usuario) =>
          x.id === u.id ? { ...x, clave } : x,
        ),
      },
      `Clave actualizada: ${u.nombre}`,
    );
  };
  const edit = (u: Usuario) => {
    const nombre = prompt("Nombre completo", u.nombre)?.trim();
    if (!nombre) return;
    const usuario = prompt("Nombre de usuario", u.usuario || u.correo)?.trim().toLowerCase();
    if (!usuario) return;
    const correo = prompt("Correo electrónico", u.correo)?.trim().toLowerCase();
    if (!correo) return;
    const rol = prompt(`Perfil o rol institucional:\n${roles.join(" · ")}`, u.rol)?.trim() as Rol;
    if (!rol || !roles.includes(rol)) return alert("Seleccione un perfil válido exactamente como aparece en la lista.");
    const cargo = prompt("Área, servicio o cargo", u.cargo || "")?.trim() || "";
    const tipo = prompt("Tipo de personal: Asistencial o Administrativo", u.tipo || "Administrativo")?.trim() as TipoPersonal;
    if (!["Asistencial", "Administrativo"].includes(tipo)) return alert("El tipo debe ser Asistencial o Administrativo.");
    const entidadId = prompt(
      `Hospital o entidad (ID):\n${db.entidades.map((e: Entidad) => `${e.id} = ${e.nombre}`).join("\n")}`,
      u.entidadId || "",
    )?.trim() || "";
    if (entidadId && !db.entidades.some((e: Entidad) => e.id === entidadId))
      return alert("El hospital o entidad seleccionado no existe.");
    if (db.usuarios.some((x: Usuario) => x.id !== u.id && (x.usuario === usuario || x.correo === correo)))
      return alert("El usuario o el correo ya está registrado.");
    save(
      {
        ...db,
        usuarios: db.usuarios.map((x: Usuario) =>
          x.id === u.id ? { ...x, nombre, usuario, correo, rol, cargo, tipo, entidadId } : x,
        ),
      },
      `Datos de acceso actualizados: ${nombre}`,
    );
  };
  return (
    <div className="grid">
      <div className="card span4">
        <h3>Crear usuarios y líderes</h3>
        <input
          className="input"
          placeholder="Nombre"
          onChange={(e) => setP({ ...p, nombre: e.target.value })}
        />
        <input
          className="input"
          placeholder="Nombre de usuario"
          onChange={(e) => setP({ ...p, usuario: e.target.value.toLowerCase().replace(/\s+/g, ".") })}
        />
        <input
          className="input"
          placeholder="Correo"
          onChange={(e) => setP({ ...p, correo: e.target.value })}
        />
        <input
          className="input"
          placeholder="Área o servicio"
          onChange={(e) => setP({ ...p, cargo: e.target.value })}
        />
        <input
          className="input"
          type="password"
          placeholder="Contraseña inicial (mínimo 8)"
          onChange={(e) => setP({ ...p, clave: e.target.value })}
        />
        <select onChange={(e) => setP({ ...p, entidadId: e.target.value })}>
          <option value="">Seleccione hospital o entidad</option>
          {db.entidades.map((entidad: Entidad) => <option key={entidad.id} value={entidad.id}>{entidad.nombre}</option>)}
        </select>
        <select onChange={(e) => setP({ ...p, rol: e.target.value })}>
          {roles.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select onChange={(e) => setP({ ...p, tipo: e.target.value })}>
          <option>Asistencial</option>
          <option>Administrativo</option>
        </select>
        <button className="btn primary" onClick={add}>
          Crear usuario
        </button>
      </div>
      <div className="card span8">
        <h3>Usuarios, claves y activación</h3>
        <table className="table">
          <tbody>
            {db.usuarios.filter((u: Usuario) => !/\bdemo\b/i.test(`${u.nombre} ${u.usuario || ""} ${u.correo}`)).map((u: Usuario) => (
              <tr key={u.id}>
                <td>
                  <b>{u.nombre}</b>
                  <br />
                  <span className="mini">@{u.usuario || u.correo} · {u.correo}</span>
                </td>
                <td>{u.rol}<br /><span className="mini">{u.cargo || u.tipo || "Sin área"}</span></td>
                <td>
                  <span className={`pill ${u.activo ? "ok" : "bad"}`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>
                  <button className="btn" onClick={() => edit(u)}>
                    Editar acceso
                  </button>
                  <button className="btn" onClick={() => reset(u)}>
                    <KeyRound size={14} /> Cambiar clave
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Agrebot({ session }: any) {
  const [p, setP] = useState("");
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const consultar = async () => {
    const text = p.trim();
    if (!text || loading) return;
    const history = [...messages];
    setMessages([...history, { role: "user", content: text }]);
    setP("");
    setLoading(true);
    try {
      const payload = await askAgrebot(text, history);
      setMessages([
        ...history,
        { role: "user", content: text },
        { role: "assistant", content: payload.answer },
      ]);
    } catch (e: any) {
      setMessages([
        ...history,
        { role: "user", content: text },
        {
          role: "assistant",
          content: e.message || "AGREBOT no pudo responder.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="grid">
      <div className="welcomeCard span12">
        <div>
          <span className="welcomeTag">IA institucional</span>
          <h2>AGREBOT</h2>
          <p>
            Chat institucional con memoria de la conversación y acceso
            controlado según tu perfil.
          </p>
        </div>
        <div className="welcomeLogo">
          <Bot size={54} />
        </div>
      </div>
      <div className="card span12 agrebotChat">
        <div className="row between">
          <div className="row">
            <div className="icon">
              <Bot />
            </div>
            <div>
              <h3>Hola, {session.nombre}</h3>
              <p className="muted">
                Puedes preguntar, responder “sí” y continuar profundizando sin
                perder el contexto.
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button className="btn" onClick={() => setMessages([])}>
              Nueva conversación
            </button>
          )}
        </div>
        <div className="chatHistory">
          {messages.length === 0 && (
            <div className="chatWelcome">
              <Bot size={32} />
              <b>¿En qué te ayudo?</b>
              <span>
                Ejemplo: “¿Cuántos afiliados hay?” y luego “sí, muéstralos por
                hospital”.
              </span>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chatBubble ${m.role}`}>
              <span>{m.role === "user" ? "Tú" : "AGREBOT"}</span>
              <p>{m.content}</p>
            </div>
          ))}
          {loading && (
            <div className="chatBubble assistant">
              <span>AGREBOT</span>
              <p>Analizando información institucional…</p>
            </div>
          )}
        </div>
        <div className="chatComposer">
          <textarea
            className="input"
            rows={3}
            value={p}
            placeholder="Escribe tu mensaje…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                consultar();
              }
            }}
            onChange={(e) => setP(e.target.value)}
          />
          <button
            className="btn primary"
            disabled={loading || !p.trim()}
            onClick={consultar}
          >
            {loading ? "Analizando…" : "Enviar"}
          </button>
        </div>
        <p className="mini">
          Enter para enviar · Shift + Enter para nueva línea · Las decisiones
          administrativas requieren intervención humana.
        </p>
      </div>
    </div>
  );
}
function Auditoria({ db }: any) {
  return (
    <div className="card">
      <h3>Auditoría y trazabilidad</h3>
      <table className="table">
        <tbody>
          {(db.auditoria || []).map((x: string, i: number) => (
            <tr key={i}>
              <td>{x}</td>
            </tr>
          ))}
          {db.asignacionesMensuales
            .filter((a: Asignacion) => a.notificarEstadistica)
            .map((a: Asignacion) => (
              <tr key={a.id}>
                <td>
                  <b>Alerta Estadística:</b> Anexo {a.anexo} cargado
                  extemporáneo por {usuarioNombre(db, a.responsableId)} el{" "}
                  {a.fechaCarga}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
function icon(m: string) {
  const props = { size: 17 };
  if (m.includes("AGREBOT")) return <Bot {...props} />;
  if (m.includes("Parámetros")) return <Building2 {...props} />;
  if (m.includes("Permisos")) return <Settings {...props} />;
  if (m.includes("clave") || m.includes("Usuarios"))
    return <KeyRound {...props} />;
  if (
    m.includes("Informe") ||
    m.includes("Asignación") ||
    m.includes("Trámites")
  )
    return <FileText {...props} />;
  if (m.includes("documental")) return <FolderKanban {...props} />;
  if (m.includes("agremiados")) return <Users {...props} />;
  if (m.includes("Auditoría")) return <ShieldCheck {...props} />;
  if (m.includes("Ficha")) return <ClipboardCheck {...props} />;
  return <BarChart3 {...props} />;
}
