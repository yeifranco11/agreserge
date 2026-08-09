"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./test.module.css";

type Person = { nombre: string; entidad: string; area: string };
const labels = ["Totalmente en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Totalmente de acuerdo"];

export default function PsychologyTestPage() {
  const [login, setLogin] = useState({ documento: "", clave: "" });
  const [person, setPerson] = useState<Person | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [responses, setResponses] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [finished, setFinished] = useState(false);
  const perPage = 10;
  const visible = useMemo(() => questions.slice(page * perPage, page * perPage + perPage), [questions, page]);
  const answered = responses.filter(Boolean).length;

  async function load() {
    const response = await fetch("/api/public/psychology-16pf", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setQuestions(data.questions || []);
    setResponses(Array.isArray(data.assessment?.responses) ? data.assessment.responses : []);
    setPerson(data.person || null);
  }
  useEffect(() => { load(); }, []);

  async function enter(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/public/psychology-16pf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", ...login }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.error || "No fue posible ingresar");
    setPerson(data.person); await load();
  }
  async function save(action = "save") {
    setBusy(true); setMessage("");
    const compact = questions.map((_, index) => responses[index]).filter(Boolean);
    if (action === "complete" && compact.length !== questions.length) { setBusy(false); return setMessage(`Faltan ${questions.length - compact.length} respuestas.`); }
    const response = await fetch("/api/public/psychology-16pf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, responses: action === "complete" ? responses : responses.slice(0, answered) }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.error || "No se pudo guardar");
    if (action === "complete") setFinished(true); else setMessage("Avance guardado de forma segura.");
  }

  if (finished) return <main className={styles.page}><section className={styles.success}><img src="/logo.png" alt="AGRESERGE"/><h1>Cuestionario finalizado</h1><p>Gracias. Tus respuestas quedaron protegidas y disponibles únicamente para el equipo profesional autorizado.</p><b>Este resultado no constituye diagnóstico clínico.</b></section></main>;
  return <main className={styles.page}>
    <header className={styles.header}><img src="/logo.png" alt="Logo AGRESERGE"/><div><span>Portal institucional de Psicología</span><h1>Cuestionario descriptivo de personalidad</h1><p>163 afirmaciones · Escala de 1 a 5 · Uso orientativo y revisión profesional</p></div></header>
    {!person ? <form className={styles.login} onSubmit={enter}><h2>Acceso del afiliado partícipe</h2><p>Ingresa tu número de documento y la clave institucional entregada por AGRESERGE.</p><label>Número de documento<input inputMode="numeric" value={login.documento} onChange={e=>setLogin({...login,documento:e.target.value.replace(/\D/g,"")})} required/></label><label>Clave de acceso<input type="password" value={login.clave} onChange={e=>setLogin({...login,clave:e.target.value})} required/></label><label className={styles.consent}><input type="checkbox" required/> Autorizo el tratamiento de estas respuestas sensibles para evaluación psicológica institucional.</label><button disabled={busy}>{busy?"Validando…":"Ingresar al cuestionario"}</button>{message&&<p className={styles.error}>{message}</p>}</form>
    : <section className={styles.test}>
      <div className={styles.person}><div><b>{person.nombre}</b><span>{person.entidad} · {person.area}</span></div><strong>{answered}/{questions.length}</strong></div>
      <div className={styles.progress}><i style={{width:`${questions.length?answered/questions.length*100:0}%`}}/></div>
      <div className={styles.scale}><span>1 · Totalmente en desacuerdo</span><span>5 · Totalmente de acuerdo</span></div>
      {visible.map((question, localIndex)=>{const index=page*perPage+localIndex;return <article className={styles.question} key={index}><div><b>{index+1}</b><p>{question}</p></div><div className={styles.options}>{[1,2,3,4,5].map(value=><label key={value} title={labels[value-1]}><input type="radio" name={`q-${index}`} checked={responses[index]===value} onChange={()=>{const next=[...responses];next[index]=value;setResponses(next)}}/><span>{value}</span></label>)}</div></article>})}
      <footer className={styles.actions}><button className={styles.secondary} disabled={page===0||busy} onClick={()=>setPage(page-1)}>Anterior</button><button className={styles.secondary} disabled={busy} onClick={()=>save()}>Guardar avance</button>{(page+1)*perPage<questions.length?<button disabled={visible.some((_,i)=>!responses[page*perPage+i])} onClick={()=>setPage(page+1)}>Continuar</button>:<button disabled={busy||answered!==questions.length} onClick={()=>save("complete")}>Finalizar y enviar</button>}</footer>{message&&<p className={styles.notice}>{message}</p>}
      <p className={styles.disclaimer}>Instrumento descriptivo orientativo. La interpretación y cualquier conclusión clínica corresponden exclusivamente a un profesional de Psicología habilitado.</p>
    </section>}
  </main>;
}
