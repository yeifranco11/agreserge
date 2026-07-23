import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSessionUserId, hashPassword } from "../../../lib/agreserge-auth";
import { loadDB } from "../../../lib/agreserge-db";
import { canAdmin } from "../../../lib/agreserge-permissions";
import { consolidateDrivePeriod, openDrivePeriod } from "../../../lib/apps-script-drive";
import {
  HGC_ADMIN_LEADERS,
  HGC_ASSISTANCE_LEADERS,
  HGC_ENTITY_ID,
  HGC_ENTITY_NAME,
  HGC_OBLIGATIONS,
} from "../../../lib/hgc-report-config";
import { requireSupabaseAdmin } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

const slug = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");

async function context() {
  const userId = await getSessionUserId();
  if (!userId) throw new Error("Sesión requerida");
  const db = await loadDB();
  const actor = db.usuarios.find((user: any) => user.id === userId && user.activo);
  if (!actor) throw new Error("Usuario inactivo");
  return { userId, db, actor, supabase: requireSupabaseAdmin() as any };
}

export async function GET() {
  try {
    const { actor, supabase } = await context();
    const superManager = ["Administrador de Sistemas", "Coordinación AGRESERGE", "Coordinación General", "Coordinador General", "Director Ejecutivo"].includes(actor.rol);
    const manager = superManager || ["Coordinadora Administrativa y Financiera", "Coordinación Administrativa", "Coordinación Asistencial", "Coordinador de Proceso AGRESERGE", "Líder Institucional", "Líder de Proceso"].includes(actor.rol);
    let submissions = supabase.from("agreserge_report_submissions").select("*, obligation:agreserge_report_obligations(*), annex:agreserge_report_annexes(*)").order("orden");
    if (!manager) submissions = submissions.eq("responsable_id", actor.id);
    else if (!superManager) submissions = submissions.or(`responsable_id.eq.${actor.id},delegado_por_id.eq.${actor.id}`);
    const [periods, obligations, annexes, submissionRows] = await Promise.all([
      supabase.from("agreserge_report_periods").select("*, entity:agreserge_entities(*)").order("created_at", { ascending: false }),
      supabase.from("agreserge_report_obligations").select("*").order("orden"),
      supabase.from("agreserge_report_annexes").select("*").order("orden"),
      submissions,
    ]);
    for (const result of [periods, obligations, annexes, submissionRows]) if (result.error) throw result.error;
    return NextResponse.json({
      periods: periods.data || [],
      obligations: obligations.data || [],
      annexes: annexes.data || [],
      submissions: submissionRows.data || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudieron cargar los informes" }, { status: error.message === "Sesión requerida" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { actor, db, supabase } = await context();
    const input = await request.json();
    if (!canAdmin(actor)) return NextResponse.json({ error: "Perfil no autorizado" }, { status: 403 });

    if (input.action === "bootstrap-hgc") {
      await supabase.from("agreserge_entities").upsert({
        id: HGC_ENTITY_ID, nombre: HGC_ENTITY_NAME, ciudad: "La Unión, Valle del Cauca", updated_at: new Date().toISOString(),
      });
      const existing = db.usuarios;
      const adminCoordinator = existing.find((u: any) => ["Coordinadora Administrativa y Financiera", "Coordinación Administrativa"].includes(u.rol));
      const assistanceCoordinator = existing.find((u: any) => u.rol === "Coordinación Asistencial");
      const generalCoordinator = existing.find((u: any) => ["Coordinador General", "Coordinación General", "Director Ejecutivo", "Administrador de Sistemas"].includes(u.rol)) || actor;
      const leaders = [
        ...HGC_ADMIN_LEADERS.map(([nombre, area], index) => ({ nombre, area, group: "administrativo", index })),
        ...HGC_ASSISTANCE_LEADERS.map(([nombre, area], index) => ({ nombre, area, group: "asistencial", index })),
      ];
      const userRows = leaders.map(({ nombre, area, group }) => {
        const usuario = slug(nombre);
        const current = existing.find((u: any) => slug(u.nombre) === usuario);
        return {
          id: current?.id || `hgc-${usuario}`,
          nombre,
          usuario: current?.usuario || usuario,
          correo: current?.correo || `${usuario}@agreserge.local`,
          clave_hash: current ? undefined : hashPassword("Agreserge2026!"),
          rol: "Líder de Proceso",
          tipo: group === "asistencial" ? "Asistencial" : "Administrativo",
          entidad_id: HGC_ENTITY_ID,
          activo: true,
          cargo: area,
          updated_at: new Date().toISOString(),
        };
      }).map((row) => Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)));
      const usersResult = await supabase.from("agreserge_users").upsert(userRows, { onConflict: "id" });
      if (usersResult.error) throw usersResult.error;

      for (const obligation of HGC_OBLIGATIONS) {
        const obligationId = `00000000-0000-4000-8000-${String(obligation.number).padStart(12, "0")}`;
        const obligationResult = await supabase.from("agreserge_report_obligations").upsert({
          id: obligationId, entidad_id: HGC_ENTITY_ID, numero: obligation.number,
          titulo: obligation.title, orden: obligation.number, activa: true, updated_at: new Date().toISOString(),
        }, { onConflict: "entidad_id,numero" });
        if (obligationResult.error) throw obligationResult.error;
        const annexes = obligation.annexes.length ? obligation.annexes : [{ number: null as any, title: "Evidencia y certificación de la obligación" }];
        const annexRows = annexes.map((annex, index) => {
          const isAdministrative = annex.number === 1 || annex.number === 2;
          const isAssistance = annex.number === 3 || annex.number === 4;
          return {
            obligation_id: obligationId,
            numero: annex.number,
            titulo: annex.title,
            orden: index + 1,
            responsable_id: isAdministrative ? adminCoordinator?.id || generalCoordinator.id : isAssistance ? assistanceCoordinator?.id || generalCoordinator.id : generalCoordinator.id,
            coordinador_id: isAdministrative ? adminCoordinator?.id || actor.id : isAssistance ? assistanceCoordinator?.id || actor.id : generalCoordinator.id,
            activa: true,
            updated_at: new Date().toISOString(),
          };
        });
        await supabase.from("agreserge_report_annexes").delete().eq("obligation_id", obligationId);
        const annexResult = await supabase.from("agreserge_report_annexes").insert(annexRows);
        if (annexResult.error) throw annexResult.error;
      }
      return NextResponse.json({ ok: true, usersCreated: userRows.length, obligations: 24, annexes: 27 });
    }

    if (input.action === "reset-periods") {
      const result = await supabase.from("agreserge_report_periods").delete().eq("entidad_id", input.entidadId || HGC_ENTITY_ID);
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true });
    }

    if (input.action === "open-period") {
      const entidadId = input.entidadId || HGC_ENTITY_ID;
      const entity = db.entidades.find((item: any) => item.id === entidadId) || { id: entidadId, nombre: HGC_ENTITY_NAME };
      const obligationsResult = await supabase.from("agreserge_report_obligations").select("*").eq("entidad_id", entidadId).eq("activa", true).order("orden");
      if (obligationsResult.error) throw obligationsResult.error;
      const obligationIds = (obligationsResult.data || []).map((item: any) => item.id);
      const annexResult = await supabase.from("agreserge_report_annexes").select("*").in("obligation_id", obligationIds).eq("activa", true).order("orden");
      if (annexResult.error) throw annexResult.error;
      const users = db.usuarios;
      const assignments = (annexResult.data || []).map((annex: any) => {
        const obligation = (obligationsResult.data || []).find((item: any) => item.id === annex.obligation_id);
        const responsible = users.find((item: any) => item.id === annex.responsable_id) || actor;
        const subSource = annex.numero === 1 ? HGC_ADMIN_LEADERS : annex.numero === 3 ? HGC_ASSISTANCE_LEADERS : [];
        const subinformes = subSource.map(([nombre, titulo], index) => {
          const user = users.find((item: any) => slug(item.nombre) === slug(nombre));
          return { responsableId: user?.id || actor.id, responsableNombre: nombre, titulo, orden: index + 1 };
        });
        return { obligacion: obligation.numero, anexo: annex.numero, titulo: annex.titulo, responsableId: responsible.id, responsableNombre: responsible.nombre, subinformes };
      });
      const drive = await openDrivePeriod({ hospital: entity.nombre, mes: input.mes, anio: String(input.anio), assignments });
      const periodId = randomUUID();
      const periodResult = await supabase.from("agreserge_report_periods").insert({
        id: periodId, entidad_id: entidadId, mes: input.mes, anio: Number(input.anio),
        fecha_limite: input.fechaLimite || null, coordinador_id: actor.id,
        drive_folder_id: drive.folderId, drive_folder_url: drive.folderUrl,
      });
      if (periodResult.error) throw periodResult.error;
      const rows: any[] = [];
      drive.items.forEach((item: any, index: number) => {
        const source = assignments[index];
        const obligation = (obligationsResult.data || []).find((entry: any) => entry.numero === source.obligacion);
        const annex = (annexResult.data || []).find((entry: any) => entry.obligation_id === obligation.id && entry.numero === source.anexo);
        const parentId = randomUUID();
        rows.push({
          id: parentId, period_id: periodId, obligation_id: obligation.id, annex_id: annex?.id || null,
          responsable_id: source.responsableId, delegado_por_id: actor.id, titulo: source.titulo,
          orden: source.obligacion * 100 + (annex?.orden || 1), estado: "Asignado",
          drive_folder_id: item.folderId, drive_folder_url: item.folderUrl, drive_file_id: item.id, drive_file_url: item.url,
        });
        (item.subitems || []).forEach((sub: any) => rows.push({
          id: randomUUID(), period_id: periodId, obligation_id: obligation.id, annex_id: annex?.id || null,
          parent_id: parentId, responsable_id: sub.responsableId, delegado_por_id: source.responsableId,
          titulo: sub.nombre, orden: source.obligacion * 100 + sub.orden,
          estado: "Asignado", drive_folder_id: sub.folderId || item.folderId, drive_folder_url: sub.folderUrl, drive_file_id: sub.id, drive_file_url: sub.url,
        }));
      });
      const submissionsResult = await supabase.from("agreserge_report_submissions").insert(rows);
      if (submissionsResult.error) throw submissionsResult.error;
      return NextResponse.json({ ok: true, periodId, folderUrl: drive.folderUrl });
    }

    if (input.action === "delegate" || input.action === "reorder") {
      const updates: any = { updated_at: new Date().toISOString() };
      if (input.action === "delegate") {
        updates.responsable_id = input.responsableId;
        updates.delegado_por_id = actor.id;
      } else updates.orden = Number(input.orden);
      const result = await supabase.from("agreserge_report_submissions").update(updates).eq("id", input.id);
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true });
    }

    if (input.action === "close-period") {
      const periodResult = await supabase.from("agreserge_report_periods").select("*, entity:agreserge_entities(*)").eq("id", input.periodId).single();
      if (periodResult.error) throw periodResult.error;
      const submissions = await supabase.from("agreserge_report_submissions").select("*, obligation:agreserge_report_obligations(*), annex:agreserge_report_annexes(*)").eq("period_id", input.periodId).order("orden");
      if (submissions.error) throw submissions.error;
      const items = (submissions.data || []).filter((item: any) => !item.parent_id).map((item: any) => ({
        obligacion: item.obligation.numero, obligacionTitulo: item.obligation.titulo,
        anexo: item.annex?.numero ?? null, titulo: item.titulo, orden: item.orden,
        url: item.drive_file_url || item.archivo_path, responsableNombre: db.usuarios.find((u: any) => u.id === item.responsable_id)?.nombre,
        subitems: (submissions.data || []).filter((sub: any) => sub.parent_id === item.id).map((sub: any) => ({
          titulo: sub.titulo, orden: sub.orden, url: sub.drive_file_url,
          responsableNombre: db.usuarios.find((u: any) => u.id === sub.responsable_id)?.nombre,
        })),
      }));
      const drive = await consolidateDrivePeriod({
        hospital: periodResult.data.entity.nombre, mes: periodResult.data.mes,
        anio: String(periodResult.data.anio), items,
      });
      const update = await supabase.from("agreserge_report_periods").update({
        estado: "Cerrado", closed_at: new Date().toISOString(),
        consolidated_doc_id: drive.id, consolidated_doc_url: drive.url, updated_at: new Date().toISOString(),
      }).eq("id", input.periodId);
      if (update.error) throw update.error;
      return NextResponse.json({ ok: true, url: drive.url, wordUrl: drive.wordUrl });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo procesar el informe" }, { status: 500 });
  }
}
