"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Award, CheckCircle2, Download, FileSpreadsheet, MessageCircle, PaintBucket, RefreshCw, Search, XCircle } from "lucide-react";

type Status = "VENCIDO" | "PROXIMO" | "VIGENTE" | "PENDIENTE" | "NO_APLICA";
type Certificate = { course: string; value: string; status: Status; expiresAt: string | null; daysRemaining: number | null };
type Affiliate = { sheet: string; entity: string; document: string; name: string; area: string; phone: string; certificates: Certificate[] };

const labels: Record<Status, string> = { VENCIDO: "Vencido", PROXIMO: "Próximo a vencer", VIGENTE: "Vigente", PENDIENTE: "Pendiente", NO_APLICA: "No aplica" };
const formatDate = (iso: string | null) => iso ? new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`)) : "—";
const cleanPhone = (phone: string) => { const digits = phone.replace(/\D/g, ""); return digits.length === 10 ? `57${digits}` : digits; };
const isActionable = (certificate: Certificate) => ["VENCIDO", "PROXIMO", "PENDIENTE"].includes(certificate.status);
const buildMessage = (person: Affiliate, certificates: Certificate[]) => {
  const detail = certificates.filter(isActionable).map(cert => `• ${cert.course}: ${cert.status === "VENCIDO" ? `VENCIDO — venció el ${formatDate(cert.expiresAt)}` : cert.status === "PROXIMO" ? `PRÓXIMO A VENCER — vence el ${formatDate(cert.expiresAt)}` : "PENDIENTE — sin certificado vigente registrado"}`).join("\n");
  return `Cordial saludo ${person.name}, desde AGRESERGE te informamos que debes gestionar los siguientes cursos o certificados:\n\n${detail}\n\nPor favor realiza su actualización y entrega los soportes correspondientes. Muchas gracias.`;
};

export function CertificateTracking() {
  const [data, setData] = useState<{ affiliates: Affiliate[]; sourceUpdatedAt: string; warningDays: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [filters, setFilters] = useState({ search: "", entity: "", area: "", course: "", status: "PENDIENTE" });
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
    courses: [...new Set(rows.map(x => x.cert.course))].filter(Boolean),
  }), [data, rows]);
  const visible = useMemo(() => (data?.affiliates || []).map(person => {
    const q = filters.search.trim().toUpperCase();
    const personMatches = (!q || `${person.name} ${person.document}`.toUpperCase().includes(q)) &&
      (!filters.entity || person.entity === filters.entity) && (!filters.area || person.area === filters.area);
    const certificates = personMatches ? person.certificates.filter(cert =>
      (!filters.course || cert.course === filters.course) && (!filters.status || cert.status === filters.status)) : [];
    return { person, certificates };
  }).filter(item => item.certificates.length > 0), [data, filters]);
  const counts = useMemo(() => rows.reduce((a, x) => { a[x.cert.status]++; return a; }, { VENCIDO: 0, PROXIMO: 0, VIGENTE: 0, PENDIENTE: 0, NO_APLICA: 0 } as Record<Status, number>), [rows]);
  const exportCsv = () => {
    const detailRows = visible.flatMap(({ person, certificates }) => certificates.map(cert => [person.entity, person.name, person.document, person.area, cert.course, cert.expiresAt || "", labels[cert.status], person.phone]));
    const csv = [["Entidad","Nombre","Documento","Área o servicio","Curso o certificado","Vencimiento","Estado","Teléfono"], ...detailRows]
      .map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); a.download = "seguimiento-certificados-agreserge.csv"; a.click(); URL.revokeObjectURL(a.href);
  };
  const exportWhatsappXlsx = async () => {
    const XLSX = await import("xlsx");
    const records = visible.map(({ person, certificates }) => ({ person, certificates: certificates.filter(isActionable) })).filter(x => x.certificates.length > 0 && x.person.phone);
    const exportRows = records.map(({ person, certificates }) => ({
      Cliente: person.name,
      Cedula: person.document,
      Telefono: `+${cleanPhone(person.phone)}`,
      Mensaje: buildMessage(person, certificates),
      ADJUNTO_PATH: "", PDF_PATH: "", Estado: "", FechaEnvio: "", Observacion: "",
    }));
    const sheet = XLSX.utils.json_to_sheet(exportRows, { header: ["Cliente","Cedula","Telefono","Mensaje","ADJUNTO_PATH","PDF_PATH","Estado","FechaEnvio","Observacion"] });
    sheet["!cols"] = [{wch:29},{wch:16},{wch:20},{wch:91},{wch:22},{wch:58},{wch:11},{wch:12},{wch:13}];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "ENVIOS");
    XLSX.writeFile(workbook, "PLANTILLA_WHATSAPP_CERTIFICADOS_AGRESERGE.xlsx", { compression: true });
  };
  const markAlerts = async () => {
    if (!confirm("Se marcarán en la base oficial: rojo los vencidos o pendientes, amarillo los próximos, verde los vigentes y gris los que no aplican. ¿Continuar?")) return;
    setMarking(true);
    try {
      const response = await fetch("/api/agreserge-certificates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "markAlerts", days: 60 }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      alert(`Alertas actualizadas en ${payload.sheets.length} hojas para ${payload.activeRows} afiliados activos.`);
      await load();
    } catch (e: any) { alert(e.message || "No se pudieron marcar las alertas"); } finally { setMarking(false); }
  };
  const whatsapp = (person: Affiliate, certificates: Certificate[]) => {
    const actionable = certificates.filter(isActionable);
    const message = buildMessage(person, actionable);
    window.open(`https://wa.me/${cleanPhone(person.phone)}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  if (loading) return <div className="certLoading"><RefreshCw className="spin" /> Analizando certificados de todos los municipios…</div>;
  if (error) return <div className="certError"><AlertTriangle /><div><b>No fue posible consultar la base</b><p>{error}</p><button className="btn primary" onClick={load}>Reintentar</button></div></div>;
  return <div className="certificateModule">
    <section className="certHero"><div><span className="badge">INTELIGENCIA DOCUMENTAL</span><h2>Control de certificados</h2><p>Solo afiliados activos. Una ficha por persona, con todos sus cursos y vigencias desde la base oficial.</p></div><Award size={52}/></section>
    <section className="certKpis"><article><b>{data?.affiliates.length || 0}</b><span>Afiliados analizados</span></article><article className="danger"><b>{counts.VENCIDO}</b><span>Vencidos</span></article><article className="warning"><b>{counts.PROXIMO}</b><span>Próximos (60 días)</span></article><article className="pending"><b>{counts.PENDIENTE}</b><span>Pendientes</span></article><article className="success"><b>{counts.VIGENTE}</b><span>Vigentes</span></article></section>
    <section className="card certFilters"><div className="certActions"><h3>Consulta y reportes</h3><button className="btn" onClick={load}><RefreshCw size={16}/>Actualizar</button><button className="btn" onClick={exportCsv}><Download size={16}/>CSV detallado</button><button className="btn certExcelButton" onClick={exportWhatsappXlsx}><FileSpreadsheet size={16}/>Excel WhatsApp masivo</button><button className="btn certAlertButton" disabled={marking} onClick={markAlerts}><PaintBucket size={16}/>{marking ? "Marcando…" : "Marcar alertas en Excel"}</button></div>
      <div className="certFilterGrid"><label className="certSearch"><Search size={17}/><input placeholder="Nombre o número de documento" value={filters.search} onChange={e=>setFilters({...filters,search:e.target.value})}/></label><select value={filters.entity} onChange={e=>setFilters({...filters,entity:e.target.value})}><option value="">Todas las entidades</option>{options.entities.map(x=><option key={x}>{x}</option>)}</select><select value={filters.area} onChange={e=>setFilters({...filters,area:e.target.value})}><option value="">Todas las áreas</option>{options.areas.map(x=><option key={x}>{x}</option>)}</select><select value={filters.course} onChange={e=>setFilters({...filters,course:e.target.value})}><option value="">Todos los cursos</option>{options.courses.map(x=><option key={x}>{x}</option>)}</select><select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})}><option value="">Todos los estados</option>{Object.entries(labels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
      <p className="certResultCount"><b>{visible.length} afiliados encontrados.</b> Cada persona aparece una sola vez con todos los cursos que coinciden con los filtros. “No aplica” se conserva para trazabilidad.</p>
    </section>
    <section className="certPeopleList">{visible.slice(0,1200).map(({person,certificates}) => {
      const actionable = certificates.filter(isActionable);
      return <article className="card certPerson" key={`${person.sheet}-${person.document}`}>
        <header className="certPersonHead"><div><span className="certPersonEntity">{person.entity}</span><h3>{person.name || "Sin nombre registrado"}</h3><p>{person.document || "Sin documento"} · {person.area || "Sin área registrada"}</p></div><span className="certCourseCount">{certificates.length} {certificates.length === 1 ? "curso" : "cursos"}</span></header>
        <div className="certCourseList">{certificates.map(cert => <div className="certCourse" key={cert.course}><div><b>{cert.course}</b><small>{cert.expiresAt ? `Vencimiento: ${formatDate(cert.expiresAt)}` : "Sin fecha vigente registrada"}{cert.daysRemaining !== null ? ` · ${cert.daysRemaining < 0 ? `${Math.abs(cert.daysRemaining)} días vencido` : `${cert.daysRemaining} días restantes`}` : ""}</small></div><span className={`certStatus ${cert.status.toLowerCase()}`}>{cert.status === "VIGENTE" ? <CheckCircle2/> : cert.status === "VENCIDO" ? <XCircle/> : <AlertTriangle/>}{labels[cert.status]}</span></div>)}</div>
        <footer className="certPersonActions"><span>{person.phone ? `WhatsApp: ${person.phone}` : "Sin teléfono registrado"}</span>{person.phone && actionable.length > 0 && <button className="waButton" onClick={()=>whatsapp(person, actionable)}><MessageCircle/>Enviar {actionable.length} {actionable.length === 1 ? "curso" : "cursos"} en un mensaje</button>}</footer>
      </article>;
    })}{!visible.length && <div className="certEmpty">No hay afiliados con cursos que coincidan con estos filtros.</div>}</section>
  </div>;
}
