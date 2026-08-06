"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clipboard, Clock3, Download, ExternalLink, Search, Trash2, UserRound, Users, XCircle } from "lucide-react";
import styles from "./psychotechnical-scheduling.module.css";

const PUBLIC_PATH = "/agendamiento/pruebas-psicotecnicas";
const dateLabel = (value: string) => new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
const timeLabel = (value: string) => new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(`2026-01-01T${String(value).slice(0,5)}:00`));

export function PsychotechnicalScheduling() {
  const [data, setData] = useState<any>({ campaign: null, slots: [], bookings: [] });
  const [filter, setFilter] = useState("");
  const [day, setDay] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    const response = await fetch("/api/agreserge-scheduling", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setData(payload);
  };
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  const slotMap = useMemo(() => Object.fromEntries(data.slots.map((slot: any) => [slot.id, slot])), [data.slots]);
  const active = data.bookings.filter((item: any) => item.estado !== "CANCELADA");
  const visible = data.bookings.filter((item: any) => {
    const slot: any = slotMap[item.slot_id];
    const q = filter.toUpperCase();
    return (!day || slot?.fecha === day) && (!q || `${item.nombre_completo} ${item.documento} ${item.area}`.toUpperCase().includes(q));
  });
  const update = async (bookingId: string, estado: string) => {
    if (estado === "CANCELADA" && !confirm("¿Cancelar esta reserva y liberar el cupo?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/agreserge-scheduling", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, estado }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error); await load();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const remove = async (booking: any) => {
    if (!confirm(`¿Eliminar definitivamente la reserva de ${booking.nombre_completo}?\n\nEl cupo quedará disponible de inmediato.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/agreserge-scheduling", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      await load();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const copy = async () => { await navigator.clipboard.writeText(`${location.origin}${PUBLIC_PATH}`); alert("Enlace público copiado."); };
  const exportCsv = () => {
    const rows = [["FECHA","HORA","NOMBRE","DOCUMENTO","ÁREA O SERVICIO","ESTADO"], ...visible.map((item: any) => { const slot: any = slotMap[item.slot_id]; return [slot?.fecha, String(slot?.hora).slice(0,5), item.nombre_completo, item.documento, item.area, item.estado]; })];
    const csv = rows.map((row: any[]) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })); link.download = "agenda-pruebas-psicotecnicas.csv"; link.click(); URL.revokeObjectURL(link.href);
  };
  const days = Array.from(new Set(data.slots.map((slot: any) => slot.fecha))) as string[];
  return <div className="grid">
    <div className="welcomeCard span12"><div><span className="welcomeTag">Coordinación Asistencial</span><h2>Agendamiento · Pruebas psicotécnicas</h2><p>Administra en tiempo real la agenda pública de afiliados partícipes del Hospital Gonzalo Contreras.</p></div><div className="welcomeLogo"><CalendarDays size={52} /></div></div>
    <div className="card span12">
      <div className="toolbar"><div><h3>Enlace público para compartir</h3><p className="muted">No requiere usuario ni contraseña. Valida al afiliado por su cédula.</p></div><div className="actions"><button className="btn secondary" onClick={copy}><Clipboard size={17}/> Copiar enlace</button><a className="btn primary" href={PUBLIC_PATH} target="_blank"><ExternalLink size={17}/> Abrir agenda</a></div></div>
    </div>
    <Kpi title="Reservas activas" value={active.length} icon={<Users/>}/><Kpi title="Cupos totales" value={data.slots.reduce((n:number,s:any)=>n+s.capacidad,0)} icon={<CalendarDays/>}/><Kpi title="Cupos disponibles" value={data.slots.reduce((n:number,s:any)=>n+s.capacidad,0)-active.length} icon={<CheckCircle2/>}/><Kpi title="Canceladas" value={data.bookings.filter((x:any)=>x.estado==="CANCELADA").length} icon={<XCircle/>}/>
    <div className="card span12">
      <div className="toolbar"><div><span className="welcomeTag">Control visual</span><h3>Calendario de agendamiento</h3><p className="muted">Consulta rápidamente quién está agendado en cada día y horario.</p></div></div>
      <div className={styles.calendar}>{days.map((date) => <section className={styles.day} key={date}>
        <header><CalendarDays/><div><span>{dateLabel(date).split(",")[0]}</span><strong>{dateLabel(date).split(",").slice(1).join(",")}</strong></div></header>
        <div className={styles.slotGrid}>{data.slots.filter((slot:any)=>slot.fecha===date).map((slot:any)=>{
          const people=active.filter((booking:any)=>booking.slot_id===slot.id);
          return <article className={styles.slot} key={slot.id}>
            <div className={styles.slotHeader}><div><Clock3/><strong>{timeLabel(slot.hora)}</strong></div><span className={people.length>=slot.capacidad?styles.full:""}>{people.length}/{slot.capacidad}</span></div>
            <div className={styles.people}>{people.map((person:any)=><div className={styles.person} key={person.id}><UserRound/><div><strong>{person.nombre_completo}</strong><span>{person.documento} · {person.area}</span></div><button disabled={busy} onClick={()=>remove(person)} title="Eliminar reserva" aria-label={`Eliminar reserva de ${person.nombre_completo}`}><Trash2/></button></div>)}
              {!people.length&&<div className={styles.emptySlot}>Horario disponible · {slot.capacidad} cupos</div>}
            </div>
          </article>;
        })}</div>
      </section>)}</div>
    </div>
    <div className="card span12">
      <div className="toolbar"><div><h3>Personas agendadas</h3><p className="muted">Busca, filtra, marca asistencia o libera un cupo.</p></div><button className="btn secondary" onClick={exportCsv}><Download size={17}/> Descargar Excel/CSV</button></div>
      <div className="filters"><label className="searchBox"><Search size={18}/><input value={filter} onChange={(e)=>setFilter(e.target.value)} placeholder="Nombre, cédula o área"/></label><select className="input" value={day} onChange={(e)=>setDay(e.target.value)}><option value="">Todos los días</option>{days.map((value)=><option key={value} value={value}>{dateLabel(value)}</option>)}</select></div>
      {error && <div className="notice error">{error}</div>}
      <div className="tableWrap"><table><thead><tr><th>Fecha y hora</th><th>Afiliado partícipe</th><th>Documento</th><th>Área o servicio</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{visible.map((item:any)=>{const slot:any=slotMap[item.slot_id];return <tr key={item.id}><td><b>{slot?dateLabel(slot.fecha):"—"}</b><br/><span className="muted">{slot?timeLabel(slot.hora):"—"}</span></td><td><b>{item.nombre_completo}</b></td><td>{item.documento}</td><td>{item.area}</td><td><span className="badge">{item.estado}</span></td><td><div className={styles.rowActions}><select disabled={busy} value={item.estado} onChange={(e)=>update(item.id,e.target.value)}><option>CONFIRMADA</option><option>ASISTIÓ</option><option>NO ASISTIÓ</option><option>CANCELADA</option></select><button className={styles.deleteButton} disabled={busy} onClick={()=>remove(item)} title="Eliminar reserva"><Trash2 size={17}/> Eliminar</button></div></td></tr>})}{!visible.length&&<tr><td colSpan={6} className="empty">Aún no hay reservas con estos filtros.</td></tr>}</tbody></table></div>
    </div>
  </div>;
}

function Kpi({ title, value, icon }: any) { return <div className="kpi"><div>{icon}</div><span>{title}</span><b>{value}</b></div>; }
