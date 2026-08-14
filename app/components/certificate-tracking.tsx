"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Award, CheckCircle2, Download, MessageCircle, RefreshCw, Search, XCircle } from "lucide-react";

type Status = "VENCIDO" | "PROXIMO" | "VIGENTE" | "PENDIENTE" | "NO_APLICA";
type Certificate = { course: string; value: string; status: Status; expiresAt: string | null; daysRemaining: number | null };
type Affiliate = { sheet: string; entity: string; document: string; name: string; area: string; phone: string; certificates: Certificate[] };

const labels: Record<Status, string> = { VENCIDO: "Vencido", PROXIMO: "Próximo a vencer", VIGENTE: "Vigente", PENDIENTE: "Pendiente", NO_APLICA: "No aplica" };
const formatDate = (iso: string | null) => iso ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)) : "—";
const cleanPhone = (phone: string) => { const digits = phone.replace(/\D/g, ""); return digits.length === 10 ? `57${digits}` : digits; };

export function CertificateTracking() {
  const [data, setData] = useState<{ affiliates: Affiliate[]; sourceUpdatedAt: string; warningDays: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", entity: "", area: "", course: "", status: "" });
  const load = async () => {
    setLoading(true); setError("");
    try { const response = await fetch("/api/agreserge-certificates?days=60", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error); setData(payload); }
    catch (e: any) { setError(e.message || "No se pudo cargar la información"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const rows = useMemo(() => (data?.affiliates || []).flatMap(person => person.certificates.map(cert => ({ person, cert }))), [data]);
  const options = useMemo(() => ({
    entities: [...new Set((data?.affiliates || []).map(x => x.entity))].filter(Boolean).sort(),
    areas: [...new Set((data?.affiliates || []).map(x => x.area))].filter(Boolean).sort(),
    courses: [...new Set(rows.map(x => x.cert.course))].filter(Boolean).sort(),
  }), [data, rows]);
  const visible = useMemo(() => rows.filter(({ person, cert }) => {
    const q = filters.search.trim().toUpperCase();
    return (!q || `${person.name} ${person.document}`.toUpperCase().includes(q)) && (!filters.entity || person.entity === filters.entity) &&
      (!filters.area || person.area === filters.area) && (!filters.course || cert.course === filters.course) && (!filters.status || cert.status === filters.status);
  }), [rows, filters]);
  const counts = useMemo(() => rows.reduce((a, x) => { a[x.cert.status]++; return a; }, { VENCIDO: 0, PROXIMO: 0, VIGENTE: 0, PENDIENTE: 0, NO_APLICA: 0 } as Record<Status, number>), [rows]);
  const exportCsv = () => {
    const csv = [["Entidad","Nombre","Documento","Área o servicio","Curso o certificado","Vencimiento","Estado","Teléfono"], ...visible.map(({person,cert}) => [person.entity,person.name,person.document,person.area,cert.course,cert.expiresAt || "",labels[cert.status],person.phone])]
      .map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); a.download = "seguimiento-certificados-agreserge.csv"; a.click(); URL.revokeObjectURL(a.href);
  };
  const whatsapp = (person: Affiliate, cert: Certificate) => {
    const message = `Hola ${person.name}, desde AGRESERGE te informamos que el certificado “${cert.course}” ${cert.status === "VENCIDO" ? `venció el ${formatDate(cert.expiresAt)}` : cert.status === "PROXIMO" ? `vence el ${formatDate(cert.expiresAt)}` : "está pendiente"}. Por favor gestiona su actualización y entrega el soporte correspondiente.`;
    window.open(`https://wa.me/${cleanPhone(person.phone)}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  if (loading) return <div className="certLoading"><RefreshCw className="spin" /> Analizando certificados de todos los municipios…</div>;
  if (error) return <div className="certError"><AlertTriangle /><div><b>No fue posible consultar la base</b><p>{error}</p><button className="btn primary" onClick={load}>Reintentar</button></div></div>;
  return <div className="certificateModule">
    <section className="certHero"><div><span className="badge">INTELIGENCIA DOCUMENTAL</span><h2>Control de certificados</h2><p>Seguimiento centralizado de cursos y vigencias desde la base oficial de AGRESERGE.</p></div><Award size={52}/></section>
    <section className="certKpis">
      <article><b>{data?.affiliates.length || 0}</b><span>Afiliados analizados</span></article>
      <article className="danger"><b>{counts.VENCIDO}</b><span>Vencidos</span></article><article className="warning"><b>{counts.PROXIMO}</b><span>Próximos (60 días)</span></article>
      <article className="pending"><b>{counts.PENDIENTE}</b><span>Pendientes</span></article><article className="success"><b>{counts.VIGENTE}</b><span>Vigentes</span></article>
    </section>
    <section className="card certFilters"><div className="certActions"><h3>Consulta y reportes</h3><button className="btn" onClick={load}><RefreshCw size={16}/>Actualizar</button><button className="btn primary" onClick={exportCsv}><Download size={16}/>Exportar CSV</button></div>
      <div className="certFilterGrid"><label className="certSearch"><Search size={17}/><input placeholder="Nombre o número de documento" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/></label>
      <select value={filters.entity} onChange={e=>setFilters({...filters,entity:e.target.value})}><option value="">Todas las entidades</option>{options.entities.map(x=><option key={x}>{x}</option>)}</select>
      <select value={filters.area} onChange={e=>setFilters({...filters,area:e.target.value})}><option value="">Todas las áreas</option>{options.areas.map(x=><option key={x}>{x}</option>)}</select>
      <select value={filters.course} onChange={e=>setFilters({...filters,course:e.target.value})}><option value="">Todos los cursos</option>{options.courses.map(x=><option key={x}>{x}</option>)}</select>
      <select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">Todos los estados</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
      <p className="certResultCount">{visible.length} resultados. “No aplica” se conserva para trazabilidad y no se cuenta como pendiente.</p>
    </section>
    <section className="card certTableWrap"><table className="certTable"><thead><tr><th>Afiliado partícipe</th><th>Entidad / área</th><th>Curso o certificado</th><th>Vencimiento</th><th>Estado</th><th>Gestión</th></tr></thead><tbody>{visible.slice(0,1200).map(({person,cert},i)=><tr key={`${person.sheet}-${person.document}-${cert.course}-${i}`}><td><b>{person.name || "Sin nombre"}</b><small>{person.document}</small></td><td>{person.entity}<small>{person.area || "Sin área registrada"}</small></td><td>{cert.course}</td><td>{formatDate(cert.expiresAt)}{cert.daysRemaining !== null && <small>{cert.daysRemaining < 0 ? `${Math.abs(cert.daysRemaining)} días vencido` : `${cert.daysRemaining} días restantes`}</small>}</td><td><span className={`certStatus ${cert.status.toLowerCase()}`}>{cert.status === "VIGENTE" ? <CheckCircle2/> : cert.status === "VENCIDO" ? <XCircle/> : <AlertTriangle/>}{labels[cert.status]}</span></td><td>{person.phone && ["VENCIDO","PROXIMO","PENDIENTE"].includes(cert.status) ? <button className="waButton" onClick={()=>whatsapp(person,cert)}><MessageCircle/>WhatsApp</button> : "—"}</td></tr>)}</tbody></table>{!visible.length && <div className="certEmpty">No hay resultados con estos filtros.</div>}</section>
  </div>;
}
