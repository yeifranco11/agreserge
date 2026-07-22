"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  createDigitalRequest,
  decideDigitalRequest,
  loadPayrollReport,
  loadPayrollPeriods,
  lookupPayroll,
  openPayrollPeriod,
} from "../../lib/agreserge-client";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/11R2hU9IzD55MBa8FivztC38boeQAxGpoMly_3yH0Ajk/edit?usp=sharing";
const cop = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value || 0);
const safe = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export function NominaComprobantes({ session }: any) {
  const [documento, setDocumento] = useState("");
  const [payroll, setPayroll] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [periods, setPeriods] = useState<any[]>([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const now = new Date();
  const monthNames = [
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
  const [period, setPeriod] = useState<any>({
    mes: monthNames[now.getMonth()],
    anio: String(now.getFullYear()),
    sheetUrl: SHEET_URL,
  });
  const isAffiliate = session.rol === "Agremiado";
  const payrollDeductions = payroll
    ? payroll.salud + payroll.pension + payroll.arl + payroll.parafiscales + payroll.bienestar + payroll.retencion + payroll.otrosDescuentos
    : 0;
  const canManage = [
    "Administrador de Sistemas",
    "Coordinadora",
    "Coordinación AGRESERGE",
    "Coordinación General",
    "Coordinación Administrativa",
    "Coordinador de Sede",
    "Tesorería",
    "Coordinadora Administrativa y Financiera",
    "Coordinador General",
    "Gerente",
  ].includes(session.rol);

  const refreshPeriods = async () => {
    try {
      const payload = await loadPayrollPeriods();
      setPeriods(payload.periods || []);
      if (payload.periods?.length)
        setPeriod((current: any) => ({
          ...current,
          mes: payload.periods[0].mes,
          anio: payload.periods[0].anio,
        }));
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    refreshPeriods();
  }, []);
  const abrirPeriodo = async () => {
    setPeriodLoading(true);
    setError("");
    try {
      await openPayrollPeriod(period.mes, period.anio, period.sheetUrl);
      await refreshPeriods();
      alert(`Nómina ${period.mes} ${period.anio} guardada en el historial.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPeriodLoading(false);
    }
  };

  const buscar = async () => {
    setLoading(true);
    setError("");
    setPayroll(null);
    try {
      const result = await lookupPayroll(
        isAffiliate ? "" : documento,
        period.mes,
        period.anio,
      );
      setPayroll(result.payroll);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  const imprimir = () => {
    if (!payroll) return;
    const windowRef = window.open("", "_blank", "width=900,height=900");
    if (!windowRef)
      return alert("Permite ventanas emergentes para generar el comprobante.");
    const deductions =
      payroll.salud +
      payroll.pension +
      payroll.arl +
      payroll.parafiscales +
      payroll.bienestar +
      payroll.retencion +
      payroll.otrosDescuentos;
    const item = (label: string, value: number, strong = false) =>
      `<div class="item${strong ? " strong" : ""}"><span>${label}</span><b>${cop(value)}</b></div>`;
    windowRef.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comprobante ${safe(payroll.documento)}</title><style>
      @page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#eef5fb;color:#0d1b35;font:13px Arial,sans-serif}.sheet{max-width:850px;margin:auto;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 18px 50px #173b6520}.top{height:10px;background:linear-gradient(90deg,#074d8d,#119be1,#d29a12)}header{padding:24px 28px;display:grid;grid-template-columns:82px 1fr auto;gap:16px;align-items:center;border-bottom:1px solid #dce7f2}header img{width:74px;height:74px;object-fit:contain}.org{font-size:11px;letter-spacing:.12em;color:#55708e;font-weight:700}.brand{font-size:25px;font-weight:900;color:#073765;margin:4px 0}.docTitle{text-align:right;background:#e9f3ff;color:#07549b;padding:13px 16px;border-radius:14px;font-weight:900;letter-spacing:.06em}.period{text-align:right;margin-top:7px;font-weight:700}.identity{margin:20px 28px;display:grid;grid-template-columns:2fr 1fr 1fr;gap:1px;background:#cddceb;border:1px solid #cddceb;border-radius:14px;overflow:hidden}.field{background:#fff;padding:13px 15px;min-height:62px}.field.wide{grid-column:span 2}.field label{display:block;font-size:10px;color:#647b94;font-weight:800;letter-spacing:.08em;margin-bottom:6px}.field div{font-size:14px;font-weight:800}.columns{margin:0 28px;display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{border:1px solid #d7e4f0;border-radius:16px;overflow:hidden}.panel h3{margin:0;padding:13px 16px;background:#0b5ca8;color:#fff;font-size:14px;letter-spacing:.04em}.item{display:flex;justify-content:space-between;gap:16px;padding:10px 14px;border-bottom:1px solid #edf2f7}.item:last-child{border:0}.item span{font-size:11px;font-weight:700}.item b{white-space:nowrap}.item.strong{background:#eff7ff;color:#074c8d}.grand{margin:20px 28px;background:linear-gradient(105deg,#074e96,#158fdb);color:white;border-radius:16px;padding:17px 20px;display:flex;align-items:center;justify-content:space-between;font-size:18px;font-weight:900}.grand b{font-size:25px}.signatures{margin:52px 28px 20px;display:grid;grid-template-columns:1fr 1fr;gap:70px}.signature{border-top:1px solid #17334f;text-align:center;padding-top:8px;font-size:11px;font-weight:700}.footer{margin:0 28px 24px;padding-top:12px;border-top:1px dashed #b8c9da;color:#6b7f94;font-size:9px;display:flex;justify-content:space-between}.seal{color:#0870bd;font-weight:800}@media print{body{background:white}.sheet{box-shadow:none;border-radius:0}.top{-webkit-print-color-adjust:exact;print-color-adjust:exact}.panel h3,.grand{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body><main class="sheet"><div class="top"></div><header><img src="${location.origin}/logo.png" alt="Logo AGRESERGE"><div><div class="org">ASOCIACIÓN GREMIAL SINDICAL DE PRESTACIONES DE SERVICIOS GENERALES Y DE SALUD DEL VALLE</div><div class="brand">AGRESERGE</div><div>NIT 901.432.027-0</div></div><div><div class="docTitle">COMPROBANTE DE COMPENSACIÓN</div><div class="period">PERIODO: ${safe(period.mes).toUpperCase()} ${safe(period.anio)}</div></div></header><section class="identity"><div class="field wide"><label>AFILIADO PARTÍCIPE</label><div>${safe(payroll.nombre)}</div></div><div class="field"><label>IDENTIFICACIÓN</label><div>${safe(payroll.documento)}</div></div><div class="field"><label>PROCESO</label><div>${safe(payroll.cargo)}</div></div><div class="field"><label>ÁREA O SERVICIO</label><div>${safe(payroll.area)}</div></div><div class="field"><label>DÍAS COMPENSADOS</label><div>${safe(payroll.dias)}</div></div></section><section class="columns"><div class="panel"><h3>COMPENSACIONES</h3>${item("COMPENSACIÓN ORDINARIA", payroll.ordinaria)}${item("OTRAS COMPENSACIONES", payroll.otras)}${item("TOTAL COMPENSADO", payroll.ordinaria + payroll.otras, true)}${item("COMPENSACIÓN POR TRANSPORTE", payroll.transporte)}${item("COMPENSACIÓN POR TIEMPO ADICIONAL", payroll.adicionales)}${item("COMPENSACIÓN POR DESCANSO", payroll.descanso || 0)}</div><div class="panel"><h3>APORTES Y DEDUCCIONES</h3>${item("EPS", payroll.salud)}${item("PENSIONES", payroll.pension)}${item("ARL", payroll.arl)}${item("COMFANDI", payroll.parafiscales)}${item("BIENESTAR SOCIAL", payroll.bienestar)}${item("RETEFUENTE", payroll.retencion)}${item("DEDUCCIONES ADICIONALES", payroll.otrosDescuentos)}${item("TOTAL DEDUCCIONES", deductions, true)}</div></section><div class="grand"><span>TOTAL A PAGAR</span><b>${cop(payroll.totalRecibido)}</b></div><section class="signatures"><div class="signature">ELABORÓ<br>Coordinación administrativa</div><div class="signature">FIRMA Y CÉDULA AFILIADO PARTÍCIPE</div></section><footer class="footer"><span>Generado electrónicamente desde el Portal Institucional AGRESERGE.</span><span class="seal">Documento verificable · ${safe(payroll.tab)}</span></footer></main><script>window.onload=()=>setTimeout(()=>window.print(),350)</script></body></html>`);
    windowRef.document.close();
  };
  const generarInforme = async () => {
    setReportLoading(true);
    setError("");
    try {
      setReport(await loadPayrollReport());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReportLoading(false);
    }
  };
  const exportarInforme = () => {
    if (!report) return;
    const headers = [
      "Documento",
      "Nombre",
      "Proceso",
      "Área o servicio",
      "Hospital/Pestaña",
      "Dias",
      "Compensacion ordinaria",
      "Salud",
      "Pension",
      "ARL",
      "Retencion",
      "Total recibido",
      "Costo total proceso",
    ];
    const lines = [
      headers,
      ...report.rows.map((r: any) => [
        r.documento,
        r.nombre,
        r.cargo,
        r.area,
        r.tab,
        r.dias,
        r.ordinaria,
        r.salud,
        r.pension,
        r.arl,
        r.retencion,
        r.totalRecibido,
        r.totalProceso,
      ]),
    ].map((row) =>
      row.map((v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
    );
    const blob = new Blob(["\ufeff" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `informe_nomina_agreserge_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="grid">
      <div className="welcomeCard span12">
        <div>
          <span className="welcomeTag">Nómina integrada</span>
          <h2>Centro de nómina y comprobantes</h2>
          <p>
            Consulta la hoja institucional en línea y genera comprobantes
            individuales directamente por documento.
          </p>
        </div>
        <div className="welcomeLogo">
          <FileSpreadsheet size={54} />
        </div>
      </div>
      {canManage && (
        <div className="card span12 payrollPeriodCard">
          <div className="row between">
            <div>
              <span className="welcomeTag">Apertura mensual</span>
              <h3>Abrir nueva nómina e historial</h3>
              <p className="muted">
                Crea una copia del formato maestro en Google Sheets, pega aquí
                su enlace y habilita el periodo para los afiliados.
              </p>
            </div>
            <a
              className="btn"
              href="https://docs.google.com/spreadsheets/d/11R2hU9IzD55MBa8FivztC38boeQAxGpoMly_3yH0Ajk/copy"
              target="_blank"
            >
              Crear copia mensual
            </a>
          </div>
          <div className="periodControls">
            <select
              value={period.mes}
              onChange={(e) => setPeriod({ ...period, mes: e.target.value })}
            >
              {monthNames.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              value={period.anio}
              onChange={(e) => setPeriod({ ...period, anio: e.target.value })}
            />
            <input
              className="input periodUrl"
              value={period.sheetUrl}
              onChange={(e) =>
                setPeriod({ ...period, sheetUrl: e.target.value })
              }
              placeholder="Enlace del nuevo Google Sheets mensual"
            />
            <button
              className="btn primary"
              disabled={periodLoading}
              onClick={abrirPeriodo}
            >
              {periodLoading ? "Abriendo…" : "Abrir mes y guardar historial"}
            </button>
          </div>
          <div className="periodHistory">
            {periods.map((p: any) => (
              <a key={`${p.anio}-${p.mes}`} href={p.sourceUrl} target="_blank">
                <b>
                  {p.mes} {p.anio}
                </b>
                <span>Consultar Excel</span>
              </a>
            ))}
            {!periods.length && (
              <span className="muted">Todavía no hay meses abiertos.</span>
            )}
          </div>
        </div>
      )}
      {canManage && (
        <div className="card span12">
          <div className="row between">
            <div>
              <h3>Nómina HGC en línea</h3>
              <p className="muted">
                La coordinadora mantiene los cálculos en Google Sheets; el
                portal consulta siempre la versión vigente.
              </p>
            </div>
            <a className="btn primary" href={SHEET_URL} target="_blank">
              Abrir hoja completa
            </a>
          </div>
          <iframe
            className="sheetFrame"
            src={`${SHEET_URL.replace("/edit?usp=sharing", "/preview")}`}
          />
        </div>
      )}
      {canManage && (
        <div className="card span12">
          <div className="row between">
            <div>
              <h3>Inteligencia e informes de nómina</h3>
              <p className="muted">
                Indicadores automáticos por hospital, proceso y área o servicio
                tomados de la hoja vigente.
              </p>
            </div>
            <div className="row">
              <button
                className="btn primary"
                disabled={reportLoading}
                onClick={generarInforme}
              >
                {reportLoading ? "Analizando nómina..." : "Generar indicadores"}
              </button>
              {report && (
                <button className="btn" onClick={exportarInforme}>
                  <Download size={14} /> Exportar informe CSV
                </button>
              )}
            </div>
          </div>
          {report && (
            <>
              <div className="payrollKpis">
                <div>
                  <span>Personas</span>
                  <b>{report.totals.personas}</b>
                </div>
                <div>
                  <span>Compensación ordinaria</span>
                  <b>{cop(report.totals.ordinaria)}</b>
                </div>
                <div>
                  <span>Total recibido</span>
                  <b>{cop(report.totals.totalRecibido)}</b>
                </div>
                <div>
                  <span>Costo total de procesos</span>
                  <b>{cop(report.totals.totalProceso)}</b>
                </div>
              </div>
              <div className="reportColumns">
                <ReportTable
                  title="Por hospital / proceso"
                  rows={report.porHospital}
                />
                <ReportTable title="Por área" rows={report.porArea} />
                <ReportTable
                  title="Por área o servicio"
                  rows={report.porCargo.slice(0, 12)}
                />
              </div>
              <p className="mini">
                Actualizado:{" "}
                {new Date(report.updatedAt).toLocaleString("es-CO")} · Fuente:
                FORMATO NÓMINA HGC.
              </p>
            </>
          )}
        </div>
      )}
      <div className="card span4">
        <h3>
          <Search size={19} />{" "}
          {isAffiliate ? "Mi comprobante por periodo" : "Buscar comprobante"}
        </h3>
        {isAffiliate ? (
          <>
            <div className="field">
              <label>Año</label>
              <select
                value={period.anio}
                onChange={(e) => setPeriod({ ...period, anio: e.target.value })}
              >
                {[...new Set(periods.map((p: any) => p.anio))].map(
                  (year: any) => (
                    <option key={year}>{year}</option>
                  ),
                )}
              </select>
            </div>
            <div className="field">
              <label>Mes</label>
              <select
                value={period.mes}
                onChange={(e) => setPeriod({ ...period, mes: e.target.value })}
              >
                {periods
                  .filter((p: any) => String(p.anio) === String(period.anio))
                  .map((p: any) => (
                    <option key={p.mes}>{p.mes}</option>
                  ))}
              </select>
            </div>
          </>
        ) : (
          <div className="field">
            <label>Número de documento</label>
            <input
              className="input"
              inputMode="numeric"
              value={documento}
              onChange={(e) => setDocumento(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej. 1112623101"
            />
          </div>
        )}
        <button
          className="btn primary"
          disabled={loading || (isAffiliate ? !periods.length : !documento)}
          onClick={buscar}
        >
          {loading
            ? "Consultando nómina..."
            : isAffiliate
              ? "Ver mi comprobante"
              : "Consultar en línea"}
        </button>
        {error && <p className="obsBox">{error}</p>}
        <p className="mini">
          <ShieldCheck size={13} /> Consulta protegida por sesión y
          trazabilidad.
        </p>
      </div>
      <div className="card span8">
        {!payroll ? (
          <div className="emptyPayroll">
            <FileCheck2 size={48} />
            <h3>Comprobante digital</h3>
            <p>Busca un documento para previsualizar el comprobante.</p>
          </div>
        ) : (
          <div className="payrollSlip">
            <div className="payrollScreenTop" />
            <header className="payrollScreenHeader">
              <img src="/logo.png" alt="AGRESERGE" />
              <div><small>ASOCIACIÓN GREMIAL SINDICAL DE PRESTACIONES DE SERVICIOS GENERALES Y DE SALUD DEL VALLE</small><h2>AGRESERGE</h2><b>NIT 901.432.027-0</b></div>
              <div className="payrollScreenTitle"><strong>COMPROBANTE DE COMPENSACIÓN</strong><span>PERIODO: {String(period.mes).toUpperCase()} {period.anio}</span></div>
            </header>
            <div className="payrollScreenIdentity">
              <div className="wide"><span>AFILIADO PARTÍCIPE</span><b>{payroll.nombre}</b></div>
              <div><span>IDENTIFICACIÓN</span><b>{payroll.documento}</b></div>
              <div><span>PROCESO</span><b>{payroll.cargo}</b></div>
              <div><span>ÁREA O SERVICIO</span><b>{payroll.area}</b></div>
              <div><span>DÍAS COMPENSADOS</span><b>{payroll.dias}</b></div>
            </div>
            <div className="payrollScreenToolbar">
              <button className="btn primary" onClick={imprimir}>
                <Download size={15} /> Generar PDF / imprimir
              </button>
            </div>
            <div className="payrollColumns">
              <div>
                <h4>COMPENSACIONES</h4>
                <Money
                  label="COMPENSACIÓN ORDINARIA"
                  value={payroll.ordinaria}
                />
                <Money
                  label="OTRAS COMPENSACIONES"
                  value={payroll.otras}
                />
                <Money label="TOTAL COMPENSADO" value={payroll.ordinaria + payroll.otras} strong />
                <Money
                  label="COMPENSACIÓN POR TRANSPORTE"
                  value={payroll.transporte}
                />
                <Money
                  label="COMPENSACIÓN POR TIEMPO ADICIONAL"
                  value={payroll.adicionales}
                />
                <Money label="COMPENSACIÓN POR DESCANSO" value={payroll.descanso || 0} />
              </div>
              <div>
                <h4>APORTES Y DEDUCCIONES</h4>
                <Money label="EPS" value={payroll.salud} />
                <Money label="PENSIONES" value={payroll.pension} />
                <Money label="ARL" value={payroll.arl} />
                <Money label="COMFANDI" value={payroll.parafiscales} />
                <Money label="BIENESTAR SOCIAL" value={payroll.bienestar} />
                <Money label="RETEFUENTE" value={payroll.retencion} />
                <Money label="DEDUCCIONES ADICIONALES" value={payroll.otrosDescuentos} />
                <Money label="TOTAL DEDUCCIONES" value={payrollDeductions} strong />
              </div>
            </div>
            <div className="payrollTotal">
              <span>TOTAL A PAGAR</span>
              <b>{cop(payroll.totalRecibido)}</b>
            </div>
            <div className="payrollScreenSignatures"><span>ELABORÓ<br/><b>Coordinación administrativa</b></span><span>FIRMA Y CÉDULA AFILIADO PARTÍCIPE</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

function Money({ label, value, strong = false }: any) {
  return (
    <div className={`moneyRow ${strong ? "strong" : ""}`}>
      <span>{label}</span>
      <b>{cop(value)}</b>
    </div>
  );
}
function ReportTable({ title, rows }: any) {
  return (
    <div className="reportBox">
      <h4>{title}</h4>
      <div className="reportScroll">
        <table className="table">
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Personas</th>
              <th>Total recibido</th>
              <th>Costo proceso</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.grupo}>
                <td>
                  <b>{r.grupo}</b>
                </td>
                <td>{r.personas}</td>
                <td>{cop(r.totalRecibido)}</td>
                <td>{cop(r.totalProceso)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SolicitudesFirmas({ session, db, setDb }: any) {
  const [tipo, setTipo] = useState("Solicitud de permiso");
  const [form, setForm] = useState<any>({
    fechaSolicitud: new Date().toISOString().slice(0, 10),
    motivo: "Ausencia personal",
    turnoSolicita: "Completo",
    turnoAcepta: "Completo",
    coberturaCompensada: "Sí",
  });
  const [loading, setLoading] = useState(false);
  const parsed = (value: any) => {
    try {
      return JSON.parse(value || "{}");
    } catch {
      return { detalle: value };
    }
  };
  const inbox = useMemo(
    () =>
      (db.tramites || [])
        .filter((item: any) =>
          [
            "Solicitud de permiso",
            "Cambio de turno",
            "Solicitud de viáticos",
          ].includes(item.tipo),
        )
        .filter((item: any) => {
          const meta = parsed(item.observacion);
          if (session.rol === "Agremiado")
            return item.agremiadoId === session.id;
          if (["Líder Institucional", "Líder de Proceso"].includes(session.rol))
            return meta.liderId === session.id;
          return true;
        }),
    [db.tramites, session],
  );
  const sync = (payload: any) => {
    if (payload.db) {
      setDb(payload.db);
      localStorage.setItem(
        "portal_agreserge_db_v31",
        JSON.stringify(payload.db),
      );
    }
  };
  const perfil = db.perfiles?.[session.id] || {};
  const lider = db.usuarios.find((u: any) => u.id === session.liderId);
  const reset = () =>
    setForm({
      fechaSolicitud: new Date().toISOString().slice(0, 10),
      motivo: "Ausencia personal",
      turnoSolicita: "Completo",
      turnoAcepta: "Completo",
      coberturaCompensada: "Sí",
    });
  const enviar = async () => {
    setLoading(true);
    try {
      const payload = await createDigitalRequest(tipo, {
        ...form,
        documento: perfil.documento || "",
        areaNombre:
          db.areas.find((a: any) => a.id === session.areaId)?.nombre || "",
        proceso: perfil.proceso || session.cargo || "",
        cargo: session.cargo || "",
        entidad: session.entidadId,
        liderNombre: lider?.nombre || form.liderNombre || "",
      });
      sync(payload);
      reset();
      alert("Solicitud radicada y firmada digitalmente.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };
  const decidir = async (id: string, action: string) => {
    const comentario = prompt("Comentario de la decisión (opcional)", "") || "";
    try {
      sync(await decideDigitalRequest(id, action, comentario));
    } catch (e: any) {
      alert(e.message);
    }
  };
  return (
    <div className="grid">
      <div className="welcomeCard span12">
        <div>
          <span className="welcomeTag">Flujo sin papel</span>
          <h2>Solicitudes, aprobaciones y firma digital</h2>
          <p>
            El afiliado radica; el líder aprueba; coordinación administrativa o
            asistencial revisa y finaliza.
          </p>
        </div>
        <div className="welcomeLogo">
          <ShieldCheck size={54} />
        </div>
      </div>
      <div className="card span5 officialForm">
        <div className="formCode">
          <img src="/logo.png" />
          <div>
            <b>AGRESERGE DEL VALLE</b>
            <span>{tipo.toUpperCase()}</span>
          </div>
          <small>
            {tipo === "Solicitud de permiso"
              ? "AD-FO-02"
              : tipo === "Cambio de turno"
                ? "AD-FO-04"
                : "SOLICITUD DIGITAL"}
            <br />
            VERSIÓN 01
          </small>
        </div>
        <div className="field">
          <label>Tipo de solicitud</label>
          <select
            value={tipo}
            onChange={(e) => {
              setTipo(e.target.value);
              reset();
            }}
          >
            <option>Solicitud de permiso</option>
            <option>Cambio de turno</option>
            <option>Solicitud de viáticos</option>
          </select>
        </div>
        <div className="formGrid">
          <Field
            label="Fecha de solicitud"
            type="date"
            value={form.fechaSolicitud}
            set={(v) => setForm({ ...form, fechaSolicitud: v })}
          />
          <ReadField label="Afiliado(a) partícipe" value={session.nombre} />
          <ReadField
            label="Número de documento"
            value={perfil.documento || "Pendiente en ficha técnica"}
          />
          <ReadField
            label="Área / servicio"
            value={
              db.areas.find((a: any) => a.id === session.areaId)?.nombre ||
              "Sin registrar"
            }
          />
          <ReadField
            label="Proceso o función"
            value={perfil.proceso || session.cargo || "Sin registrar"}
          />
          <ReadField
            label="Líder de área"
            value={lider?.nombre || "Pendiente por asignar"}
          />
        </div>
        {tipo === "Solicitud de permiso" && (
          <>
            <h4>Motivo de ausencia</h4>
            <div className="choiceGrid">
              {[
                "Ausencia personal",
                "Cita médica",
                "Calamidad doméstica",
                "Capacitación",
                "Compensatorio",
              ].map((x) => (
                <label className={form.motivo === x ? "selected" : ""} key={x}>
                  <input
                    type="radio"
                    name="motivo"
                    checked={form.motivo === x}
                    onChange={() => setForm({ ...form, motivo: x })}
                  />
                  {x}
                </label>
              ))}
            </div>
            {form.motivo === "Compensatorio" && (
              <Field
                label="Fecha laborada que compensa"
                type="date"
                value={form.fechaLaborada || ""}
                set={(v) => setForm({ ...form, fechaLaborada: v })}
              />
            )}
            <DatePair
              form={form}
              setForm={setForm}
              a="fechaSalida"
              b="fechaRegreso"
            />
            <ReadField
              label="Total días"
              value={daysBetween(form.fechaSalida, form.fechaRegreso)}
            />
          </>
        )}
        {tipo === "Cambio de turno" && (
          <>
            <h4>Afiliado(a) que acepta el cambio</h4>
            <div className="formGrid">
              <Field
                label="Nombre completo"
                value={form.nombreAcepta || ""}
                set={(v) => setForm({ ...form, nombreAcepta: v })}
              />
              <Field
                label="C.C."
                inputMode="numeric"
                value={form.documentoAcepta || ""}
                set={(v) =>
                  setForm({ ...form, documentoAcepta: v.replace(/\D/g, "") })
                }
              />
              <Field
                label="Servicio (Área)"
                value={form.areaAcepta || ""}
                set={(v) => setForm({ ...form, areaAcepta: v })}
              />
              <Field
                label="Fecha de cobertura"
                type="date"
                value={form.fechaCobertura || ""}
                set={(v) => setForm({ ...form, fechaCobertura: v })}
              />
              <SelectField
                label="Cobertura que entrega"
                value={form.turnoSolicita}
                set={(v) => setForm({ ...form, turnoSolicita: v })}
              />
              <SelectField
                label="Cobertura que recibe"
                value={form.turnoAcepta}
                set={(v) => setForm({ ...form, turnoAcepta: v })}
              />
              <Field
                label="Fecha de devolución"
                type="date"
                value={form.fechaDevolucion || ""}
                set={(v) => setForm({ ...form, fechaDevolucion: v })}
              />
              <SelectField
                label="¿Cobertura compensada?"
                value={form.coberturaCompensada}
                set={(v) => setForm({ ...form, coberturaCompensada: v })}
                options={["Sí", "No"]}
              />
            </div>
          </>
        )}
        {tipo === "Solicitud de viáticos" && (
          <>
            <div className="formGrid">
              <Field
                label="Ciudad / destino"
                value={form.destino || ""}
                set={(v) => setForm({ ...form, destino: v })}
              />
              <Field
                label="Centro de costo"
                value={form.centroCosto || ""}
                set={(v) => setForm({ ...form, centroCosto: v })}
              />
            </div>
            <Field
              label="Objeto del viaje"
              textarea
              value={form.objeto || ""}
              set={(v) => setForm({ ...form, objeto: v })}
            />
            <DatePair
              form={form}
              setForm={setForm}
              a="fechaSalida"
              b="fechaRegreso"
            />
            <div className="formGrid">
              <Field
                label="Transporte estimado"
                type="number"
                value={form.transporte || ""}
                set={(v) => setForm({ ...form, transporte: Number(v) })}
              />
              <Field
                label="Alojamiento estimado"
                type="number"
                value={form.alojamiento || ""}
                set={(v) => setForm({ ...form, alojamiento: Number(v) })}
              />
              <Field
                label="Alimentación estimada"
                type="number"
                value={form.alimentacion || ""}
                set={(v) => setForm({ ...form, alimentacion: Number(v) })}
              />
              <ReadField
                label="Total estimado"
                value={cop(
                  Number(form.transporte || 0) +
                    Number(form.alojamiento || 0) +
                    Number(form.alimentacion || 0),
                )}
              />
            </div>
          </>
        )}
        <Field
          label="Observación / justificación"
          textarea
          value={form.detalle || ""}
          set={(v) => setForm({ ...form, detalle: v })}
        />
        <label className="signatureConsent">
          <input
            type="checkbox"
            required
            checked={Boolean(form.aceptaFirma)}
            onChange={(e) =>
              setForm({ ...form, aceptaFirma: e.target.checked })
            }
          />
          <span>
            <b>Firma electrónica del solicitante</b>
            <small>
              Confirmo que los datos son veraces y autorizo la trazabilidad de
              esta solicitud.
            </small>
          </span>
        </label>
        <button
          className="btn primary full"
          disabled={loading || !form.aceptaFirma}
          onClick={enviar}
        >
          {loading ? "Radicando..." : "Radicar y firmar digitalmente"}
        </button>
      </div>
      <div className="card span7">
        <h3>Bandeja de solicitudes</h3>
        <div className="requestList">
          {inbox.length === 0 && (
            <p className="muted">No hay solicitudes para este perfil.</p>
          )}
          {inbox.map((item: any) => {
            const meta = parsed(item.observacion);
            const canDecide = session.rol !== "Agremiado";
            return (
              <article className="requestCard" key={item.id}>
                <div className="row between">
                  <div>
                    <span
                      className={`pill ${item.estado === "Finalizado" ? "ok" : item.estado === "Rechazado" ? "bad" : "rev"}`}
                    >
                      {item.estado}
                    </span>
                    <h4>{item.tipo}</h4>
                    <p>
                      {meta.solicitanteNombre || "Afiliado partícipe"} ·{" "}
                      {meta.fechaSolicitud || item.generado}
                    </p>
                  </div>
                  <ShieldCheck size={25} />
                </div>
                <div className="requestMeta">
                  <span>
                    <b>Motivo/destino:</b>{" "}
                    {meta.motivo || meta.destino || meta.objeto || "No aplica"}
                  </span>
                  <span>
                    <b>Fechas:</b>{" "}
                    {meta.fechaSalida || meta.fechaCobertura || "-"} →{" "}
                    {meta.fechaRegreso || meta.fechaDevolucion || "-"}
                  </span>
                </div>
                <details>
                  <summary>Ver trazabilidad y firmas</summary>
                  {(meta.historial || []).map((h: any, i: number) => (
                    <p className="mini" key={i}>
                      ✓ {h.estado} · {h.nombre} ·{" "}
                      {new Date(h.fecha).toLocaleString()} · firma{" "}
                      {String(h.firma).slice(0, 12)}…
                    </p>
                  ))}
                </details>
                <div className="row">
                  <button
                    className="btn"
                    onClick={() => printRequest(item, meta)}
                  >
                    <Download size={14} /> Ver formato / PDF
                  </button>
                  {canDecide &&
                    item.estado !== "Finalizado" &&
                    item.estado !== "Rechazado" && (
                      <>
                        <button
                          className="btn primary"
                          onClick={() =>
                            decidir(
                              item.id,
                              item.estado === "Aprobado por líder"
                                ? "finalize"
                                : "approve",
                            )
                          }
                        >
                          <CheckCircle2 size={14} />{" "}
                          {item.estado === "Aprobado por líder"
                            ? "Finalizar"
                            : "Aprobar y firmar"}
                        </button>
                        <button
                          className="btn"
                          onClick={() => decidir(item.id, "reject")}
                        >
                          <XCircle size={14} /> Rechazar
                        </button>
                      </>
                    )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DatePair({ form, setForm, a, b }: any) {
  return (
    <div className="row">
      <div className="field">
        <label>Desde</label>
        <input
          className="input"
          type="date"
          value={form[a] || ""}
          onChange={(e) => setForm({ ...form, [a]: e.target.value })}
        />
      </div>
      <div className="field">
        <label>Hasta</label>
        <input
          className="input"
          type="date"
          value={form[b] || ""}
          onChange={(e) => setForm({ ...form, [b]: e.target.value })}
        />
      </div>
    </div>
  );
}

function Field({ label, set, textarea, ...props }: any) {
  return (
    <div className="field">
      <label>{label}</label>
      {textarea ? (
        <textarea
          className="input"
          rows={3}
          {...props}
          onChange={(e) => set(e.target.value)}
        />
      ) : (
        <input
          className="input"
          {...props}
          onChange={(e) => set(e.target.value)}
        />
      )}
    </div>
  );
}
function ReadField({ label, value }: any) {
  return (
    <div className="readField">
      <span>{label}</span>
      <b>{value || "—"}</b>
    </div>
  );
}
function SelectField({
  label,
  value,
  set,
  options = ["Completo", "Mañana", "Tarde", "Noche"],
}: any) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={(e) => set(e.target.value)}>
        {options.map((x: string) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </div>
  );
}
function daysBetween(a?: string, b?: string) {
  if (!a || !b) return "Pendiente";
  return String(
    Math.max(
      1,
      Math.round(
        (new Date(b + "T12:00:00").getTime() -
          new Date(a + "T12:00:00").getTime()) /
          86400000,
      ) + 1,
    ),
  );
}
function esc(value: any) {
  return String(value ?? "—").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] || c,
  );
}
function printRequest(item: any, meta: any) {
  const win = window.open("", "_blank", "width=950,height=950");
  if (!win)
    return alert("Permite ventanas emergentes para generar el formato.");
  const fields =
    item.tipo === "Solicitud de permiso"
      ? [
          ["FECHA DE SOLICITUD", meta.fechaSolicitud],
          ["NOMBRE DEL AFILIADO(A) PARTÍCIPE", meta.solicitanteNombre],
          ["NÚMERO DE DOCUMENTO", meta.documento],
          ["ÁREA A LA QUE PERTENECE", meta.areaNombre],
          ["PROCESO O FUNCIÓN", meta.proceso],
          ["NOMBRE DEL LÍDER DE ÁREA", meta.liderNombre],
          ["MOTIVO DE AUSENCIA", meta.motivo],
          ["FECHA DE SALIDA", meta.fechaSalida],
          ["FECHA DE REGRESO", meta.fechaRegreso],
          ["TOTAL DÍAS", daysBetween(meta.fechaSalida, meta.fechaRegreso)],
        ]
      : item.tipo === "Cambio de turno"
        ? [
            ["FECHA DE SOLICITUD", meta.fechaSolicitud],
            ["AFILIADO(A) SOLICITANTE", meta.solicitanteNombre],
            ["C.C.", meta.documento],
            ["SERVICIO (ÁREA)", meta.areaNombre],
            ["COBERTURA QUE ENTREGA", meta.turnoSolicita],
            ["FECHA DE COBERTURA", meta.fechaCobertura],
            ["AFILIADO(A) QUE ACEPTA", meta.nombreAcepta],
            ["C.C. QUIEN ACEPTA", meta.documentoAcepta],
            ["SERVICIO (ÁREA) QUIEN ACEPTA", meta.areaAcepta],
            ["COBERTURA QUE RECIBE", meta.turnoAcepta],
            ["FECHA DE DEVOLUCIÓN", meta.fechaDevolucion],
            ["¿COBERTURA COMPENSADA?", meta.coberturaCompensada],
          ]
        : [
            ["FECHA DE SOLICITUD", meta.fechaSolicitud],
            ["AFILIADO(A) PARTÍCIPE", meta.solicitanteNombre],
            ["DOCUMENTO", meta.documento],
            ["DESTINO", meta.destino],
            ["OBJETO DEL VIAJE", meta.objeto],
            [
              "SALIDA / REGRESO",
              `${meta.fechaSalida || "—"} / ${meta.fechaRegreso || "—"}`,
            ],
            ["TRANSPORTE", cop(meta.transporte)],
            ["ALOJAMIENTO", cop(meta.alojamiento)],
            ["ALIMENTACIÓN", cop(meta.alimentacion)],
            [
              "TOTAL ESTIMADO",
              cop(
                Number(meta.transporte || 0) +
                  Number(meta.alojamiento || 0) +
                  Number(meta.alimentacion || 0),
              ),
            ],
          ];
  const signatures = (meta.historial || [])
    .map(
      (h: any) =>
        `<div><b>${esc(h.estado)}</b><br>${esc(h.nombre)}<br><small>${esc(new Date(h.fecha).toLocaleString())}<br>Firma digital: ${esc(String(h.firma).slice(0, 20))}…</small></div>`,
    )
    .join("");
  win.document.write(
    `<!doctype html><html><head><title>${esc(item.tipo)}</title><style>@page{size:letter;margin:14mm}body{font-family:Arial;color:#111}.head{display:grid;grid-template-columns:150px 1fr 170px;border:1px solid #222}.head>*{padding:12px;border-right:1px solid #222}.head img{width:110px}.head div{text-align:center}.head small{border:0}.title{font-size:18px;font-weight:800}.grid{margin-top:30px;border:1px solid #222}.f{display:grid;grid-template-columns:260px 1fr;border-bottom:1px solid #bbb;padding:11px}.f:last-child{border:0}.f b{font-size:12px}.sign{display:grid;grid-template-columns:repeat(3,1fr);gap:25px;margin-top:70px}.sign div{border-top:1px solid #222;padding-top:8px;min-height:70px}.foot{margin-top:45px;text-align:center;font-size:11px;font-weight:700}button{margin:20px 0;padding:10px 16px}@media print{button{display:none}}</style></head><body><div class="head"><div><img src="/logo.png"></div><div><b>ASOCIACIÓN GREMIAL SINDICAL DE PRESTACIONES DE SERVICIOS GENERALES Y DE SALUD DEL VALLE</b><br>NIT: 901.432.027-0<hr><span class="title">${esc(item.tipo.toUpperCase())}</span></div><small>CÓDIGO: ${item.tipo === "Solicitud de permiso" ? "AD-FO-02" : item.tipo === "Cambio de turno" ? "AD-FO-04" : "AD-FO-DIGITAL"}<br><br>VERSIÓN: 01<br><br>FECHA: ${esc(meta.fechaSolicitud)}</small></div><div class="grid">${fields.map(([k, v]) => `<div class="f"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}</div><div class="sign">${signatures}</div><div class="foot">Dirección: Carrera 15 # 19 - 200, La Unión - Valle del Cauca<br>Documento generado y firmado electrónicamente en el Portal AGRESERGE</div><button onclick="window.print()">Guardar como PDF / imprimir</button></body></html>`,
  );
  win.document.close();
}
