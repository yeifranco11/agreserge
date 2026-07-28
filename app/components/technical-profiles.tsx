"use client";

import { Download, Plus, Printer, Save, Search, Trash2, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { saveOwnProfile } from "../../lib/agreserge-client";

const privileged = [
  "Administrador de Sistemas",
  "Coordinadora",
  "Coordinación AGRESERGE",
  "Coordinación General",
  "Coordinación Administrativa",
  "Coordinación Asistencial",
  "Coordinador de Sede",
  "Talento Humano",
  "Gerente",
  "Coordinador General",
  "Coordinadora Administrativa y Financiera",
  "Experiencia al Agremiado",
  "Asesora de Calidad",
  "Director Ejecutivo",
  "Seguridad y Salud en el Trabajo",
];
const required = [
  "documento",
  "fechaNacimiento",
  "direccion",
  "barrio",
  "municipio",
  "sexo",
  "estadoCivil",
  "eps",
];
const personal = [
  ["documento", "Número de documento", "text"],
  ["lugarExpedicion", "Lugar de expedición", "text"],
  ["fechaNacimiento", "Fecha de nacimiento", "date"],
  ["lugarNacimiento", "Lugar de nacimiento", "text"],
  ["direccion", "Dirección", "text"],
  ["barrio", "Barrio", "text"],
  ["municipio", "Municipio", "text"],
  ["departamento", "Departamento", "text"],
  ["sexo", "Género", "select:Masculino|Femenino|Otro"],
  [
    "estadoCivil",
    "Estado civil",
    "select:Soltero(a)|Casado(a)|Unión libre|Separado(a)|Viudo(a)",
  ],
  ["eps", "EPS", "text"],
  ["regimen", "Régimen", "select:Contributivo|Subsidiado"],
  [
    "nivelEscolaridad",
    "Nivel de escolaridad",
    "select:Primaria|Secundaria|Técnico|Tecnólogo|Universitario|Posgrado",
  ],
  ["condicionEspecial", "Condición especial", "text"],
] as const;
const work = [
  ["fechaIngreso", "Fecha de ingreso", "date"],
  ["estadoLaboral", "Estado laboral", "select:ACTIVO|INACTIVO"],
  ["formacion", "Formación", "text"],
  ["proceso", "Área o servicio", "text"],
  ["tipoContrato", "Tipo de vinculación", "text"],
  [
    "antiguedadProceso",
    "Antigüedad en el área o servicio",
    "select:Menos de 1 año|1 a 5 años|5 a 10 años|10 a 15 años|Más de 15 años",
  ],
  [
    "antiguedadAgremiacion",
    "Antigüedad en la agremiación",
    "select:Menos de 1 año|1 a 5 años|5 a 10 años|10 a 15 años|Más de 15 años",
  ],
  ["rh", "RH", "text"],
] as const;
const home = [
  ["clasificacionFamiliar", "Clasificación del grupo familiar", "text"],
  ["aportesHogar", "Quién realiza los aportes en el hogar", "text"],
  ["personasCargo", "Número de personas a cargo", "number"],
  [
    "ingresosFamiliares",
    "Promedio de ingresos familiares",
    "select:1 salario mínimo legal|2 a 3 S.M.L|4 a 5 S.M.L|Más de 5 S.M.L",
  ],
  [
    "zonaVivienda",
    "Zona de la vivienda",
    "select:Urbana|Rural|Corregimiento|Vereda|Invasión|Rural dispersa",
  ],
  ["materialParedes", "Material de las paredes", "text"],
  ["materialPiso", "Material del piso", "text"],
  ["materialTecho", "Material del techo", "text"],
  [
    "tipoVivienda",
    "Tipo de vivienda",
    "select:Independiente|Improvisada|Compartida",
  ],
  [
    "ocupacionVivienda",
    "Ocupación de la vivienda",
    "select:Propia|Familiar|Alquilada|Comodato|Inquilinato|Cuidado",
  ],
  ["serviciosBasicos", "Servicios básicos disponibles", "text"],
  ["habitaciones", "Número de habitaciones", "number"],
  ["mobiliario", "Mobiliario de la vivienda", "text"],
] as const;
const health = [
  ["usoTiempoLibre", "Uso del tiempo libre", "text"],
  ["enfermedadDiagnosticada", "Enfermedad diagnosticada", "text"],
  ["fuma", "¿Fuma?", "select:No|Sí"],
  ["cigarrillosDia", "Promedio al día", "number"],
  [
    "consumeAlcohol",
    "¿Consume bebidas alcohólicas?",
    "select:No|Sí - ocasional|Sí - mensual|Sí - semanal|Sí - diario",
  ],
  [
    "practicaDeporte",
    "Práctica de deporte",
    "select:No|Sí - ocasional|Sí - mensual|Sí - quincenal|Sí - semanal",
  ],
  ["peso", "Peso (kg)", "number"],
  ["tallaCm", "Talla (cm)", "number"],
  [
    "frecuenciaMedico",
    "Cada cuánto va al médico",
    "select:Semanal|Quincenal|Mensual|Trimestral|Ocasional",
  ],
] as const;

export function isSocioProfileComplete(profile: any) {
  return Boolean(
    profile?.datosAdicionales?.perfilSociodemograficoCompletado &&
    required.every((key) =>
      String(profile?.[key] ?? profile?.datosAdicionales?.[key] ?? "").trim(),
    ),
  );
}

export function TechnicalProfiles({
  db,
  save,
  setDb,
  session,
  setSession,
}: any) {
  const canBrowse = privileged.includes(session.rol);
  const affiliates = db.usuarios.filter(
    (user: any) => user.rol === "Agremiado",
  );
  const [query, setQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [targetId, setTargetId] = useState(session.id);
  const target =
    db.usuarios.find((user: any) => user.id === targetId) || session;
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const base = db.perfiles?.[target.id] || {
    userId: target.id,
    documento: "",
    estadoLaboral: target.activo ? "ACTIVO" : "INACTIVO",
    datosAdicionales: {},
  };
  const profile = drafts[target.id] || base;
  const extra = profile.datosAdicionales || {};
  const family = Array.isArray(extra.familia) ? extra.familia : [];
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return affiliates
      .filter(
        (user: any) =>
          (!entityFilter || user.entidadId === entityFilter) &&
          (!areaFilter || user.areaId === areaFilter) &&
          (
            !needle ||
            `${user.nombre} ${user.correo} ${db.perfiles?.[user.id]?.documento || ""}`
              .toLowerCase()
              .includes(needle)
          ),
      )
      .slice(0, 50);
  }, [affiliates, areaFilter, db.perfiles, entityFilter, query]);
  const exportCsv = () => {
    const headers = ["Nombre", "Documento", "Entidad", "Área o servicio", "Tipo", "Estado", "Municipio", "EPS"];
    const rows = matches.map((user: any) => {
      const item = db.perfiles?.[user.id] || {};
      return [
        user.nombre,
        item.documento || "",
        db.entidades.find((entity: any) => entity.id === user.entidadId)?.nombre || "",
        db.areas.find((area: any) => area.id === user.areaId)?.nombre || user.cargo || item.proceso || "",
        user.tipo || "",
        user.activo ? "Activo" : "Inactivo",
        item.municipio || "",
        item.eps || "",
      ];
    });
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    link.download = `perfiles-sociodemograficos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const updateUser = (patch: any) =>
    setDrafts((current) => ({
      ...current,
      [target.id]: {
        ...profile,
        __user: { ...(profile.__user || target), ...patch },
      },
    }));
  const update = (field: string, value: any) =>
    setDrafts((current) => ({
      ...current,
      [target.id]: { ...profile, [field]: value },
    }));
  const updateExtra = (field: string, value: any) =>
    setDrafts((current) => ({
      ...current,
      [target.id]: {
        ...profile,
        datosAdicionales: { ...extra, [field]: value },
      },
    }));
  const filled = required.filter((key) =>
    String(profile[key] ?? extra[key] ?? "").trim(),
  ).length;
  const completion = Math.round((filled / required.length) * 100);
  const addFamily = () =>
    updateExtra("familia", [
      ...family,
      { nombre: "", edad: "", parentesco: "", escolaridad: "", ocupacion: "" },
    ]);
  const setFamily = (index: number, field: string, value: any) =>
    updateExtra(
      "familia",
      family.map((person: any, i: number) =>
        i === index ? { ...person, [field]: value } : person,
      ),
    );
  const removeFamily = (index: number) =>
    updateExtra(
      "familia",
      family.filter((_: any, i: number) => i !== index),
    );
  const guardar = async () => {
    setFeedback(null);
    if (completion < 100)
      return setFeedback({
        type: "error",
        text: "Completa los datos personales obligatorios antes de continuar.",
      });
    if (!extra.consentimiento)
      return setFeedback({
        type: "error",
        text: "Debes aceptar el consentimiento de tratamiento de datos.",
      });
    const nextUser = profile.__user || target;
    const clean = {
      ...profile,
      userId: target.id,
      datosAdicionales: {
        ...extra,
        perfilSociodemograficoCompletado: true,
        fechaActualizacion: new Date().toISOString(),
      },
    };
    delete clean.__user;
    const next = {
      ...db,
      usuarios: db.usuarios.map((u: any) =>
        u.id === target.id ? nextUser : u,
      ),
      perfiles: { ...(db.perfiles || {}), [target.id]: clean },
    };
    if (session.rol === "Agremiado") {
      try {
        const payload = await saveOwnProfile(clean, nextUser);
        if (payload.db) {
          setDb(payload.db);
          localStorage.setItem(
            "portal_agreserge_db_v31",
            JSON.stringify(payload.db),
          );
        }
        setSession(
          payload.db?.usuarios?.find((u: any) => u.id === session.id) ||
            nextUser,
        );
        setFeedback({
          type: "ok",
          text: "Perfil guardado correctamente en Supabase.",
        });
      } catch (error: any) {
        setFeedback({
          type: "error",
          text:
            error.message || "No se pudo guardar el perfil sociodemográfico",
        });
      }
      return;
    }
    await save(next, `Perfil sociodemográfico actualizado: ${nextUser.nombre}`);
    if (target.id === session.id) setSession(nextUser);
    setFeedback({
      type: "ok",
      text: "Perfil guardado correctamente en Supabase.",
    });
  };
  const userDraft = profile.__user || target;
  const age = profile.fechaNacimiento
    ? Math.max(
        0,
        new Date().getFullYear() -
          new Date(profile.fechaNacimiento).getFullYear(),
      )
    : "";
  const val = (key: string) => profile[key] ?? extra[key] ?? "";
  const setVal = (key: string, value: any) =>
    key in profile || required.includes(key)
      ? update(key, value)
      : updateExtra(key, value);
  const imprimirFicha = () => {
    const popup = window.open("", "_blank", "width=1000,height=900");
    if (!popup) return alert("Permite ventanas emergentes para imprimir la ficha.");
    const esc = (value: any) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
    const fields = [...personal, ...work, ...home, ...health];
    const rows = fields.map(([key, label]) => `<div class="field"><span>${esc(label)}</span><b>${esc(val(key)) || "Sin registrar"}</b></div>`).join("");
    const familyRows = family.length ? family.map((person: any) => `<tr><td>${esc(person.nombre)}</td><td>${esc(person.edad)}</td><td>${esc(person.parentesco)}</td><td>${esc(person.escolaridad)}</td><td>${esc(person.ocupacion)}</td></tr>`).join("") : `<tr><td colspan="5">Sin integrantes registrados</td></tr>`;
    popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ficha ${esc(userDraft.nombre)}</title><style>@page{size:A4;margin:11mm}*{box-sizing:border-box}body{font:11px Arial;color:#11213a;margin:0}.top{height:8px;background:linear-gradient(90deg,#07539a,#17a0df,#d39b18)}header{display:grid;grid-template-columns:72px 1fr auto;gap:14px;align-items:center;padding:18px;border:1px solid #cad8e6;border-top:0}header img{width:65px;height:65px;object-fit:contain}h1{font-size:16px;margin:0 0 5px}.tag{background:#e8f3ff;color:#07539a;border-radius:12px;padding:10px;font-weight:800;text-align:center}.identity{background:#07539a;color:white;padding:15px 18px;margin:14px 0;border-radius:13px}.identity h2{margin:0 0 5px;font-size:20px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.field{border:1px solid #d7e3ee;border-radius:9px;padding:8px;min-height:48px}.field span{display:block;color:#60758c;font-size:8px;text-transform:uppercase;font-weight:800;margin-bottom:5px}.section{margin:15px 0 7px;background:#dcecff;border-left:5px solid #07539a;padding:8px;font-weight:900;text-transform:uppercase}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cad8e6;padding:7px;text-align:left}th{background:#eff6ff}.footer{margin-top:26px;border-top:1px solid #8396aa;padding-top:8px;display:flex;justify-content:space-between;color:#60758c}@media print{.top{-webkit-print-color-adjust:exact;print-color-adjust:exact}.identity,.section{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><div class="top"></div><header><img src="${location.origin}/logo.png"><div><h1>ASOCIACIÓN GREMIAL SINDICAL DE PRESTACIONES DE SERVICIOS GENERALES Y DE SALUD DEL VALLE</h1><b>NIT 901.432.027-0</b></div><div class="tag">AD-FO-65 · VERSIÓN 01<br>PERFIL SOCIODEMOGRÁFICO</div></header><section class="identity"><h2>${esc(userDraft.nombre)}</h2><span>Afiliado partícipe · Documento ${esc(val("documento"))}</span></section><div class="section">Información sociodemográfica</div><div class="grid">${rows}</div><div class="section">Composición familiar</div><table><thead><tr><th>Nombre</th><th>Edad</th><th>Parentesco</th><th>Escolaridad</th><th>Ocupación</th></tr></thead><tbody>${familyRows}</tbody></table><div class="footer"><span>Generado desde el Portal Institucional AGRESERGE</span><span>${new Date().toLocaleString("es-CO")}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
    popup.document.close();
  };
  return (
    <div className="grid socioProfile">
      {canBrowse && (
        <aside className="card span3">
          <h3>
            <Search size={18} /> Base de afiliados partícipes
          </h3>
          <input
            className="input"
            value={query}
            placeholder="Nombre o documento"
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
            <option value="">Todas las entidades</option>
            {db.entidades.map((entity: any) => <option key={entity.id} value={entity.id}>{entity.nombre}</option>)}
          </select>
          <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
            <option value="">Todas las áreas o servicios</option>
            {db.areas.filter((area: any) => !entityFilter || area.entidadId === entityFilter).map((area: any) => <option key={area.id} value={area.id}>{area.nombre}</option>)}
          </select>
          <button className="btn" onClick={exportCsv}><Download size={16} /> Exportar resultados</button>
          <div className="profileDirectory">
            {matches.map((u: any) => (
              <button
                className={`btn ${u.id === target.id ? "primary" : ""}`}
                key={u.id}
                onClick={() => setTargetId(u.id)}
              >
                <UserRound size={15} />
                {u.nombre}
              </button>
            ))}
          </div>
        </aside>
      )}
      <div className={`socioPaper ${canBrowse ? "span9" : "span12"}`}>
        <header className="socioHead">
          <div>
            <img src="/logo.png" alt="AGRESERGE" />
            <div>
              <h2>
                ASOCIACIÓN GREMIAL SINDICAL DE PRESTACIONES DE SERVICIOS
                GENERALES Y DE SALUD DEL VALLE
              </h2>
              <p>NIT: 901.432.027-0</p>
            </div>
            <div className="profileCompletion">
              <b>{completion}%</b>
              <span>completo</span>
            </div>
          </div>
          <b>
            FORMATO DE CARACTERIZACIÓN – PERFIL SOCIODEMOGRÁFICO Y FAMILIAR
            PERSONAL AFILIADO PARTÍCIPE
          </b>
          <section>
            <span>
              <strong>CÓDIGO:</strong> AD-FO-65 &nbsp; <strong>VERSIÓN:</strong>{" "}
              01
            </span>
            <span>
              <strong>FECHA ELAB.:</strong> 08/09/2025 &nbsp;{" "}
              <strong>FECHA ACTUALIZACIÓN:</strong>{" "}
              {new Date().toLocaleDateString("es-CO")}
            </span>
          </section>
        </header>
        <div className="progress">
          <i style={{ width: `${completion}%` }} />
        </div>
        <div className="formTable metaRow">
          <L>Municipio</L>
          <I value={val("municipio")} set={(v) => setVal("municipio", v)} />
          <L>Fecha</L>
          <input value={new Date().toISOString().slice(0, 10)} disabled />
          <L>Hora</L>
          <input
            value={new Date().toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            disabled
          />
        </div>
        <Band>Datos personales</Band>
        <div className="formTable personalTable">
          <L>Nombre y apellidos</L>
          <I
            wide
            value={userDraft.nombre || ""}
            set={(v) => updateUser({ nombre: v })}
          />
          <L>Edad</L>
          <input type="number" value={age} disabled />
          <L>Fecha de nacimiento</L>
          <I
            type="date"
            value={val("fechaNacimiento")}
            set={(v) => setVal("fechaNacimiento", v)}
          />
          <L>Lugar de nacimiento</L>
          <I
            wide
            value={val("lugarNacimiento")}
            set={(v) => setVal("lugarNacimiento", v)}
          />
          <L>No. documento ID</L>
          <I value={val("documento")} set={(v) => setVal("documento", v)} />
          <L>Género</L>
          <Choices
            wide
            value={val("sexo")}
            set={(v) => setVal("sexo", v)}
            options={["Masculino", "Femenino"]}
          />
          <L>Dirección</L>
          <I
            wide
            value={val("direccion")}
            set={(v) => setVal("direccion", v)}
          />
          <L>Barrio</L>
          <I value={val("barrio")} set={(v) => setVal("barrio", v)} />
          <L>Teléfono</L>
          <I
            value={userDraft.telefono || ""}
            set={(v) => updateUser({ telefono: v })}
          />
          <L>Estado civil</L>
          <Select
            value={val("estadoCivil")}
            set={(v) => setVal("estadoCivil", v)}
            options={[
              "Soltero(a)",
              "Casado(a)",
              "Unión libre",
              "Separado(a)",
              "Viudo(a)",
            ]}
          />
          <L>Cónyuge</L>
          <Choices
            value={val("conyuge")}
            set={(v) => setVal("conyuge", v)}
            options={["Sí", "No"]}
          />
          <L>EPS</L>
          <I value={val("eps")} set={(v) => setVal("eps", v)} />
          <L>Régimen</L>
          <Choices
            wide
            value={val("regimen")}
            set={(v) => setVal("regimen", v)}
            options={["Contributivo", "Subsidiado"]}
          />
          <L>Condición especial</L>
          <Multi
            wide
            value={val("condicionEspecial")}
            set={(v) => setVal("condicionEspecial", v)}
            options={[
              "Desplazado",
              "Víctima",
              "Indígena",
              "Afro",
              "Raizal",
              "Palenquero",
              "Discapacitado",
            ]}
          />
          <L>Número de hijos</L>
          <I
            type="number"
            value={val("numeroHijos")}
            set={(v) => setVal("numeroHijos", v)}
          />
          <L>Nivel de escolaridad</L>
          <Select
            wide
            value={val("nivelEscolaridad")}
            set={(v) => setVal("nivelEscolaridad", v)}
            options={[
              "Primaria",
              "Secundaria",
              "Técnico",
              "Tecnólogo",
              "Universitario",
              "Posgrado",
            ]}
          />
        </div>
        <Band>Composición familiar</Band>
        <div className="familyTable">
          <div className="familyHeader">
            <b>Nombre y apellidos</b>
            <b>Edad</b>
            <b>Parentesco</b>
            <b>Nivel escolaridad</b>
            <b>Ocupación</b>
            <b>−</b>
          </div>
          {family.map((p: any, i: number) => (
            <div className="familyGrid" key={i}>
              {["nombre", "edad", "parentesco", "escolaridad", "ocupacion"].map(
                (k) => (
                  <input
                    key={k}
                    type={k === "edad" ? "number" : "text"}
                    value={p[k] || ""}
                    onChange={(e) => setFamily(i, k, e.target.value)}
                  />
                ),
              )}
              <button
                onClick={() => removeFamily(i)}
                aria-label="Eliminar integrante"
              >
                ×
              </button>
            </div>
          ))}
          <button className="addMember" onClick={addFamily}>
            <Plus size={18} /> Agregar integrante
          </button>
          <span>Incluye todos los miembros del hogar.</span>
        </div>
        <div className="formTable familyDetails">
          <L>Clasificación grupo familiar</L>
          <I
            wide
            value={val("clasificacionFamiliar")}
            set={(v) => setVal("clasificacionFamiliar", v)}
            placeholder="Ej.: Nuclear, extensa, monoparental…"
          />
          <L>Quién realiza los aportes en el hogar</L>
          <I
            value={val("aportesHogar")}
            set={(v) => setVal("aportesHogar", v)}
          />
          <L>Número de personas a cargo</L>
          <I
            type="number"
            value={val("personasCargo")}
            set={(v) => setVal("personasCargo", v)}
          />
          <L>Promedio ingresos familiares</L>
          <Choices
            wide
            value={val("ingresosFamiliares")}
            set={(v) => setVal("ingresosFamiliares", v)}
            options={[
              "1 salario mínimo legal",
              "2 S.M.L a 3 S.M.L",
              "4 a 5 S.M.L",
              "Más de 5 S.M.L",
            ]}
          />
        </div>
        <Band>Datos de la vivienda</Band>
        <div className="housingGrid">
          <Cell title="Zona de la vivienda">
            <Choices
              value={val("zonaVivienda")}
              set={(v) => setVal("zonaVivienda", v)}
              options={[
                "Urbana",
                "Rural",
                "Corregimiento",
                "Vereda",
                "Invasión",
                "Rural dispersa",
              ]}
            />
          </Cell>
          <Cell title="Material de las paredes">
            <Choices
              value={val("materialParedes")}
              set={(v) => setVal("materialParedes", v)}
              options={[
                "Ladrillo",
                "Piedra",
                "Madera",
                "Prefabricada",
                "Bahareque",
              ]}
            />
          </Cell>
          <Cell title="Material del piso">
            <Choices
              value={val("materialPiso")}
              set={(v) => setVal("materialPiso", v)}
              options={["Baldosa", "Tierra", "Cerámica", "Cemento", "Adoquín"]}
            />
          </Cell>
          <Cell title="Material del techo">
            <Choices
              value={val("materialTecho")}
              set={(v) => setVal("materialTecho", v)}
              options={[
                "Teja de barro",
                "Eternit",
                "Esterilla",
                "Zinc",
                "Machimbre",
                "PVC",
                "Panel yeso",
                "Plancha",
              ]}
            />
          </Cell>
          <Cell title="Tipo de vivienda">
            <Choices
              value={val("tipoVivienda")}
              set={(v) => setVal("tipoVivienda", v)}
              options={["Independiente", "Improvisado", "Compartida"]}
            />
          </Cell>
          <Cell title="Tipo de ocupación de la vivienda">
            <Choices
              value={val("ocupacionVivienda")}
              set={(v) => setVal("ocupacionVivienda", v)}
              options={[
                "Propia",
                "Familiar",
                "Alquilada",
                "Comodato",
                "Inquilinato",
                "Cuidado",
              ]}
            />
          </Cell>
          <Cell title="Servicios básicos">
            <Multi
              value={val("serviciosBasicos")}
              set={(v) => setVal("serviciosBasicos", v)}
              options={["Agua", "Energía", "Gas", "TV cable", "Internet"]}
            />
          </Cell>
          <Cell title="Número de habitaciones">
            <Choices
              value={val("habitaciones")}
              set={(v) => setVal("habitaciones", v)}
              options={["1", "2", "3", "4", "5 o más"]}
            />
          </Cell>
          <Cell title="Distribución de la vivienda">
            <Multi
              value={val("distribucionVivienda")}
              set={(v) => setVal("distribucionVivienda", v)}
              options={[
                "Sala",
                "Comedor",
                "Cocina",
                "Patio",
                "Baño privado",
                "Baño social",
              ]}
            />
          </Cell>
          <Cell title="Mobiliario de la vivienda" full>
            <Multi
              value={val("mobiliario")}
              set={(v) => setVal("mobiliario", v)}
              options={[
                "Cama",
                "Sala",
                "Comedor",
                "Lavadora",
                "Estufa",
                "Televisor",
                "Nevera",
                "Computador",
                "Equipo de sonido",
                "Horno microondas",
              ]}
            />
          </Cell>
        </div>
        <Band>Salud y estilo de vida</Band>
        <div className="healthGrid">
          <Cell title="Uso de tiempo libre">
            <Multi
              value={val("usoTiempoLibre")}
              set={(v) => setVal("usoTiempoLibre", v)}
              options={[
                "Otro trabajo",
                "Lab. domésticas",
                "Recreación y deporte",
                "Estudio",
              ]}
            />
          </Cell>
          <Cell title="Antigüedad en el área o servicio">
            <Choices
              value={val("antiguedadProceso")}
              set={(v) => setVal("antiguedadProceso", v)}
              options={[
                "1 a 5 años",
                "5 a 10 años",
                "10 a 15 años",
                "Más de 15 años",
              ]}
            />
          </Cell>
          <Cell title="Le han diagnosticado alguna enfermedad">
            <Choices
              value={val("tieneEnfermedad")}
              set={(v) => setVal("tieneEnfermedad", v)}
              options={["Sí", "No"]}
            />
            <I
              value={val("enfermedadDiagnosticada")}
              set={(v) => setVal("enfermedadDiagnosticada", v)}
              placeholder="¿Cuál?"
            />
          </Cell>
          <Cell title="Fuma">
            <Choices
              value={val("fuma")}
              set={(v) => setVal("fuma", v)}
              options={["Sí", "No"]}
            />
            <I
              type="number"
              value={val("cigarrillosDia")}
              set={(v) => setVal("cigarrillosDia", v)}
              placeholder="Promedio al día"
            />
          </Cell>
          <Cell title="Consume bebidas alcohólicas">
            <Choices
              value={val("consumeAlcohol")}
              set={(v) => setVal("consumeAlcohol", v)}
              options={[
                "Sí",
                "No",
                "Diario",
                "Semanal",
                "Mensual",
                "Ocasional",
              ]}
            />
          </Cell>
          <Cell title="Practica algún deporte">
            <Choices
              value={val("practicaDeporte")}
              set={(v) => setVal("practicaDeporte", v)}
              options={[
                "Sí",
                "No",
                "Semanal",
                "Quincenal",
                "Mensual",
                "Ocasional",
              ]}
            />
          </Cell>
          <Cell title="Peso">
            <I
              type="number"
              value={val("peso")}
              set={(v) => setVal("peso", v)}
              placeholder="kg"
            />
          </Cell>
          <Cell title="Talla">
            <I
              type="number"
              value={val("tallaCm")}
              set={(v) => setVal("tallaCm", v)}
              placeholder="cm"
            />
          </Cell>
          <Cell title="Antigüedad en la agremiación">
            <Choices
              value={val("antiguedadAgremiacion")}
              set={(v) => setVal("antiguedadAgremiacion", v)}
              options={[
                "1 a 5 años",
                "5 a 10 años",
                "10 a 15 años",
                "Más de 15 años",
              ]}
            />
          </Cell>
          <Cell title="Cada cuánto va al médico" wide>
            <Choices
              value={val("frecuenciaMedico")}
              set={(v) => setVal("frecuenciaMedico", v)}
              options={[
                "Semanal",
                "Quincenal",
                "Mensual",
                "Trimestral",
                "Ocasional",
              ]}
            />
          </Cell>
          <Cell title="Consentimiento informado">
            <Choices
              value={extra.consentimiento ? "Sí" : "No"}
              set={(v) => updateExtra("consentimiento", v === "Sí")}
              options={["Sí", "No"]}
            />
            <small>
              Ley 1581 de 2012 de protección de datos personales: autoriza el
              uso y actualización de la información suministrada.
            </small>
          </Cell>
        </div>
        <div className="socioActions">
          <button className="btn primary" onClick={guardar}>
            <Save size={16} /> Guardar ficha
          </button>
          <button className="btn" onClick={imprimirFicha}>
            <Printer size={16} /> Imprimir / guardar PDF
          </button>
          <button
            className="btn"
            onClick={() =>
              setDrafts((current) => ({ ...current, [target.id]: base }))
            }
          >
            Limpiar cambios
          </button>
        </div>
        {feedback && (
          <div className={`profileFeedback ${feedback.type}`}>
            {feedback.text}
          </div>
        )}
      </div>
    </div>
  );
}

function Band({ children }: any) {
  return <h3 className="formBand">{children}</h3>;
}
function L({ children }: any) {
  return <b className="formLabel">{children}</b>;
}
function I({ value, set, wide, type = "text", placeholder }: any) {
  return (
    <input
      className={wide ? "wide" : ""}
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => set(e.target.value)}
    />
  );
}
function Select({ value, set, options, wide }: any) {
  return (
    <select
      className={wide ? "wide" : ""}
      value={value || ""}
      onChange={(e) => set(e.target.value)}
    >
      <option value="">Seleccione…</option>
      {options.map((x: string) => (
        <option key={x}>{x}</option>
      ))}
    </select>
  );
}
function Choices({ value, set, options, wide }: any) {
  return (
    <div className={`formChoices ${wide ? "wide" : ""}`}>
      {options.map((x: string) => (
        <label key={x}>
          <input type="radio" checked={value === x} onChange={() => set(x)} />
          {x}
        </label>
      ))}
    </div>
  );
}
function Multi({ value, set, options, wide }: any) {
  const selected = String(value || "")
    .split("|")
    .filter(Boolean);
  const toggle = (x: string) =>
    set(
      selected.includes(x)
        ? selected.filter((v) => v !== x).join("|")
        : [...selected, x].join("|"),
    );
  return (
    <div className={`formChoices ${wide ? "wide" : ""}`}>
      {options.map((x: string) => (
        <label key={x}>
          <input
            type="checkbox"
            checked={selected.includes(x)}
            onChange={() => toggle(x)}
          />
          {x}
        </label>
      ))}
    </div>
  );
}
function Cell({ title, children, full, wide }: any) {
  return (
    <div className={`formCell ${full ? "full" : ""} ${wide ? "wideCell" : ""}`}>
      <b>{title}</b>
      <div>{children}</div>
    </div>
  );
}
