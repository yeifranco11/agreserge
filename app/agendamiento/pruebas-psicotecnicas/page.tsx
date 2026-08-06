"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, IdCard, MapPin, ShieldCheck, UserRound, Users } from "lucide-react";
import styles from "./schedule.module.css";

type Slot = { id: string; fecha: string; hora: string; capacidad: number; disponibles: number };
type Person = { documento: string; nombre: string };
const dateLabel = (value: string) => new Intl.DateTimeFormat("es-CO", {
  weekday: "long", day: "numeric", month: "long",
  timeZone: "UTC",
}).format(new Date(`${value}T12:00:00Z`));
const timeLabel = (value: string) => new Intl.DateTimeFormat("es-CO", {
  hour: "numeric", minute: "2-digit", hour12: true,
}).format(new Date(`2026-01-01T${value}:00`));

export default function PublicSchedulePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [documento, setDocumento] = useState("");
  const [nombre, setNombre] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [confirmed, setConfirmed] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    const response = await fetch("/api/public/psychotechnical-schedule", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setSlots(payload.slots || []);
    setCampaign(payload.campaign);
  };
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
    const timer = window.setInterval(() => refresh().catch(() => undefined), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const days = useMemo(() => Array.from(new Set(slots.map((slot) => slot.fecha))), [slots]);
  const identify = (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setSelected(null); setConfirmed(null);
    const cleanName = nombre.trim().replace(/\s+/g, " ").toUpperCase();
    if (cleanName.length < 5 || documento.length < 5) {
      setError("Completa tus nombres, apellidos y número de documento."); return;
    }
    setNombre(cleanName); setPerson({ nombre: cleanName, documento });
  };
  const book = async () => {
    if (!selected || !person) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/public/psychotechnical-schedule", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "book", nombre: person.nombre, documento: person.documento, slotId: selected.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setConfirmed(payload.booking); await refresh();
    } catch (e: any) { setError(e.message); await refresh().catch(() => undefined); }
    finally { setBusy(false); }
  };

  return <main className={styles.page}>
    <div className={styles.glowOne} /><div className={styles.glowTwo} />
    <header className={styles.header}>
      <div className={styles.brand}><div className={styles.logo}><img src="/logo.png" alt="Logo AGRESERGE" /></div>
        <div><span>Portal institucional</span><strong>AGRESERGE</strong></div></div>
      <div className={styles.secure}><ShieldCheck size={18} /> Reserva segura</div>
    </header>
    <section className={styles.hero}>
      <div><span className={styles.eyebrow}>Agenda pública · Hospital Gonzalo Contreras</span>
        <h1>Pruebas <em>psicotécnicas</em></h1>
        <p>Ingresa tus nombres, apellidos y documento, selecciona un horario disponible y recibe tu confirmación al instante.</p>
        <div className={styles.features}><span><CalendarDays /> 10 al 13 de agosto</span><span><Users /> 8 cupos por horario</span><span><MapPin /> {campaign?.ubicacion || "Hospital Gonzalo Contreras E.S.E."}</span></div>
      </div>
      <div className={styles.heroArt}><CalendarDays /><b>Agenda</b><span>AGRESERGE</span></div>
    </section>

    <section className={styles.panel}>
      <div className={styles.steps}><span className={person ? styles.done : styles.current}>1 <b>Identifícate</b></span><i /><span className={selected ? styles.done : person ? styles.current : ""}>2 <b>Elige horario</b></span><i /><span className={confirmed ? styles.done : selected ? styles.current : ""}>3 <b>Confirma</b></span></div>
      {!confirmed && <>
        <form className={styles.lookup} onSubmit={identify}><div><label>Nombres y apellidos</label><div className={styles.inputWrap}><UserRound /><input value={nombre} onChange={(e) => setNombre(e.target.value.toUpperCase())} autoComplete="name" placeholder="NOMBRES Y APELLIDOS" required /></div></div><div><label>Número de documento</label><div className={styles.inputWrap}><IdCard /><input value={documento} onChange={(e) => setDocumento(e.target.value.replace(/\D/g, "").slice(0, 15))} inputMode="numeric" placeholder="Escribe tu cédula" required /></div><small>Validaremos los datos de forma segura al confirmar.</small></div><button>Continuar</button></form>
        {error && <div className={styles.error}>{error}</div>}
        {person && <div className={styles.person}><CheckCircle2 /><div><span>Datos registrados</span><strong>{person.nombre}</strong><small>Documento {person.documento}</small></div><button onClick={() => { setPerson(null); setSelected(null); }}>Cambiar</button></div>}
        {person && <div className={styles.calendar}><div className={styles.sectionTitle}><span>2</span><div><h2>Selecciona tu horario</h2><p>Los cupos se actualizan automáticamente.</p></div></div>
          <div className={styles.days}>{days.map((day) => <article key={day}><header><CalendarDays /><div><span>{dateLabel(day).split(" ")[0]}</span><b>{dateLabel(day).split(" ").slice(1).join(" ")}</b></div></header><div>{slots.filter((slot) => slot.fecha === day).map((slot) => <button type="button" key={slot.id} disabled={!slot.disponibles} onClick={() => setSelected(slot)} className={selected?.id === slot.id ? styles.selected : ""}><Clock3 /><span><b>{timeLabel(slot.hora)}</b><small>{slot.disponibles ? `${slot.disponibles} de ${slot.capacidad} disponibles` : "Cupos agotados"}</small></span>{selected?.id === slot.id && <CheckCircle2 />}</button>)}</div></article>)}</div>
        </div>}
        {selected && person && <div className={styles.confirm}><div><span>Tu selección</span><strong>{dateLabel(selected.fecha)} · {timeLabel(selected.hora)}</strong><small>{person.nombre}</small></div><button onClick={book} disabled={busy}>{busy ? "Confirmando…" : "Confirmar mi reserva"}</button></div>}
      </>}
      {confirmed && <div className={styles.success}><div className={styles.successIcon}><CheckCircle2 /></div><span>Reserva confirmada</span><h2>¡Tu cita quedó agendada!</h2><p>{confirmed.nombre}</p><div><CalendarDays /><strong>{dateLabel(confirmed.fecha)}</strong><Clock3 /><strong>{timeLabel(confirmed.hora)}</strong></div><small>Documento {confirmed.documento} · {confirmed.area}</small><button onClick={() => window.print()}>Guardar / imprimir confirmación</button></div>}
    </section>
    <footer className={styles.footer}>AGRESERGE · Asociación Gremial Sindical de Prestaciones de Servicios Generales y de Salud del Valle</footer>
  </main>;
}
