import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSessionUserId, hashPassword } from "../../../lib/agreserge-auth";
import { loadDB } from "../../../lib/agreserge-db";
import { canAdmin } from "../../../lib/agreserge-permissions";
import { consolidateDrivePeriod, createDriveSubreport, openDrivePeriod, resetDrivePeriods } from "../../../lib/apps-script-drive";
import {
  HGC_ADMIN_LEADERS,
  HGC_ASSISTANCE_LEADERS,
  HGC_ENTITY_ID,
  HGC_ENTITY_NAME,
  HGC_OBLIGATIONS,
} from "../../../lib/hgc-report-config";
import { reportConfigFor } from "../../../lib/hospital-report-config";
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

async function syncPeriodStructure({
  supabase,
  db,
  actor,
  period,
}: {
  supabase: any;
  db: any;
  actor: any;
  period: any;
}) {
  const entity = period.entity || db.entidades.find((item: any) => item.id === period.entidad_id) || {
    id: period.entidad_id,
    nombre: HGC_ENTITY_NAME,
  };
  const obligationsResult = await supabase.from("agreserge_report_obligations")
    .select("*").eq("entidad_id", period.entidad_id).eq("activa", true).order("orden");
  if (obligationsResult.error) throw obligationsResult.error;
  const obligationIds = (obligationsResult.data || []).map((item: any) => item.id);
  if (!obligationIds.length) throw new Error("La entidad no tiene obligaciones parametrizadas");
  const annexResult = await supabase.from("agreserge_report_annexes")
    .select("*").in("obligation_id", obligationIds).eq("activa", true).order("orden");
  if (annexResult.error) throw annexResult.error;
  const users = db.usuarios;
  const assignments = (annexResult.data || []).map((annex: any) => {
    const obligation = (obligationsResult.data || []).find((item: any) => item.id === annex.obligation_id);
    const responsible = users.find((item: any) => item.id === annex.responsable_id) || actor;
    const subSource = annex.numero === 1 ? HGC_ADMIN_LEADERS : annex.numero === 3 ? HGC_ASSISTANCE_LEADERS : [];
    const subinformes = subSource.map(([nombre, titulo], index) => {
      const user = users.find((item: any) => slug(item.nombre) === slug(nombre));
      return {
        responsableId: user?.id || actor.id,
        responsableNombre: nombre,
        titulo,
        orden: index + 1,
      };
    });
    return {
      obligation,
      annex,
      obligacion: obligation.numero,
      obligacionOrden: obligation.orden,
      anexo: annex.numero,
      anexoOrden: annex.orden,
      titulo: annex.titulo,
      responsableId: responsible.id,
      responsableNombre: responsible.nombre,
      subinformes,
    };
  });
  const drive = await openDrivePeriod({
    hospital: entity.nombre,
    mes: period.mes,
    anio: String(period.anio),
    obligations: (obligationsResult.data || []).map((obligation: any) => ({
      obligacion: obligation.numero,
      titulo: obligation.titulo,
    })),
    assignments,
  });
  const existingResult = await supabase.from("agreserge_report_submissions")
    .select("*").eq("period_id", period.id).order("orden");
  if (existingResult.error) throw existingResult.error;
  const existing = existingResult.data || [];
  let created = 0;
  let updated = 0;
  for (let index = 0; index < drive.items.length; index += 1) {
    const item = drive.items[index];
    const source = assignments[index];
    if (!source) continue;
    let parent = existing.find((row: any) => row.annex_id === source.annex.id && !row.parent_id);
    const parentValues: any = {
      period_id: period.id,
      obligation_id: source.obligation.id,
      annex_id: source.annex.id,
      responsable_id: source.responsableId,
      delegado_por_id: actor.id,
      titulo: source.titulo,
      orden: source.obligacionOrden * 1000 + source.anexoOrden * 100,
      estado: parent?.estado || "Asignado",
      drive_folder_id: item.folderId,
      drive_folder_url: item.folderUrl,
      updated_at: new Date().toISOString(),
    };
    if (!parent?.archivo_path) {
      parentValues.drive_file_id = item.id;
      parentValues.drive_file_url = item.url;
    }
    if (parent) {
      const result = await supabase.from("agreserge_report_submissions")
        .update(parentValues).eq("id", parent.id).select("*").single();
      if (result.error) throw result.error;
      parent = result.data;
      updated += 1;
    } else {
      const result = await supabase.from("agreserge_report_submissions")
        .insert({ id: randomUUID(), ...parentValues }).select("*").single();
      if (result.error) throw result.error;
      parent = result.data;
      existing.push(parent);
      created += 1;
    }
    const subitems = item.subitems || [];
    for (let subIndex = 0; subIndex < subitems.length; subIndex += 1) {
      const sub = subitems[subIndex];
      const subOrder = source.obligacionOrden * 1000 + source.anexoOrden * 100 + Number(sub.orden || subIndex + 1);
      let child = existing.find((row: any) =>
        row.parent_id === parent.id &&
        (row.drive_folder_id === sub.folderId || row.drive_file_id === sub.id || row.orden === subOrder));
      const childValues: any = {
        period_id: period.id,
        obligation_id: source.obligation.id,
        annex_id: source.annex.id,
        parent_id: parent.id,
        responsable_id: sub.responsableId,
        delegado_por_id: source.responsableId,
        titulo: sub.nombre,
        orden: subOrder,
        estado: child?.estado || "Asignado",
        drive_folder_id: sub.folderId || item.folderId,
        drive_folder_url: sub.folderUrl || item.folderUrl,
        updated_at: new Date().toISOString(),
      };
      if (!child?.archivo_path) {
        childValues.drive_file_id = sub.id;
        childValues.drive_file_url = sub.url;
      }
      if (child) {
        const result = await supabase.from("agreserge_report_submissions")
          .update(childValues).eq("id", child.id).select("*").single();
        if (result.error) throw result.error;
        child = result.data;
        updated += 1;
      } else {
        const result = await supabase.from("agreserge_report_submissions")
          .insert({ id: randomUUID(), ...childValues }).select("*").single();
        if (result.error) throw result.error;
        child = result.data;
        existing.push(child);
        created += 1;
      }
    }
  }
  return {
    folderId: drive.folderId,
    folderUrl: drive.folderUrl,
    created,
    updated,
    total: created + updated,
  };
}

export async function GET(request: Request) {
  try {
    const { actor, supabase } = await context();
    const searchParams = new URL(request.url).searchParams;
    const mineOnly = searchParams.get("scope") === "mine";
    const requestedEntityId = String(searchParams.get("entidadId") || "").trim();
    const superManager = ["Administrador de Sistemas", "Coordinación AGRESERGE", "Coordinación General", "Coordinador General", "Director Ejecutivo"].includes(actor.rol);
    const manager = superManager || ["Coordinadora Administrativa y Financiera", "Coordinación Administrativa", "Coordinación Asistencial", "Coordinador de Proceso AGRESERGE", "Líder Institucional", "Líder de Proceso"].includes(actor.rol);
    let submissions = supabase.from("agreserge_report_submissions").select("*, obligation:agreserge_report_obligations(*), annex:agreserge_report_annexes(*)").order("orden");
    if (mineOnly || !superManager) {
      submissions = manager
        ? submissions.or(`responsable_id.eq.${actor.id},delegado_por_id.eq.${actor.id}`)
        : submissions.eq("responsable_id", actor.id);
    }
    const [periods, obligations, annexes, submissionRows, reportFiles] = await Promise.all([
      supabase.from("agreserge_report_periods").select("*, entity:agreserge_entities(*)").order("created_at", { ascending: false }),
      supabase.from("agreserge_report_obligations").select("*").order("orden"),
      supabase.from("agreserge_report_annexes").select("*").order("orden"),
      submissions,
      supabase.from("agreserge_audit").select("id,usuario_id,metadata,created_at")
        .eq("evento", "Archivo múltiple de informe").order("created_at"),
    ]);
    for (const result of [periods, obligations, annexes, submissionRows, reportFiles]) if (result.error) throw result.error;
    const filesBySubmission = new Map<string, any[]>();
    for (const audit of reportFiles.data || []) {
      const file = { id: audit.id, uploaded_by: audit.usuario_id, created_at: audit.created_at, ...(audit.metadata || {}) };
      const list = filesBySubmission.get(file.submission_id) || [];
      list.push(file);
      filesBySubmission.set(file.submission_id, list);
    }
    const visiblePeriods = (periods.data || []).filter((period: any) =>
      (!mineOnly || period.estado !== "Cerrado") &&
      (!requestedEntityId || period.entidad_id === requestedEntityId),
    );
    const visiblePeriodIds = new Set(visiblePeriods.map((period: any) => period.id));
    const visibleSubmissions = (submissionRows.data || []).filter((submission: any) =>
      (!mineOnly && !requestedEntityId) || visiblePeriodIds.has(submission.period_id),
    );
    return NextResponse.json({
      periods: visiblePeriods,
      obligations: obligations.data || [],
      annexes: annexes.data || [],
      submissions: visibleSubmissions.map((submission: any) => ({
        ...submission,
        files: filesBySubmission.get(submission.id) || [],
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudieron cargar los informes" }, { status: error.message === "Sesión requerida" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { actor, db, supabase } = await context();
    const input = await request.json();
    const reportManagers = [
      "Administrador de Sistemas", "Coordinación AGRESERGE", "Coordinación General",
      "Coordinador General", "Director Ejecutivo", "Coordinadora Administrativa y Financiera",
      "Coordinación Administrativa", "Coordinación Asistencial",
    ];
    const canManageReports = canAdmin(actor) || reportManagers.includes(actor.rol);
    const managerActions = new Set([
      "bootstrap-hgc", "bootstrap-entity", "reset-periods", "open-period", "close-period",
      "assign-annex", "reorder-obligation", "reorder-annex", "sync-period", "cancel-period",
    ]);
    if (managerActions.has(input.action) && !canManageReports) {
      return NextResponse.json({ error: "Perfil no autorizado para administrar informes" }, { status: 403 });
    }

    if (input.action === "assign-annex") {
      if (!input.annexId || !input.responsableId) {
        return NextResponse.json({ error: "Seleccione el anexo y su responsable" }, { status: 400 });
      }
      const responsible = db.usuarios.find((user: any) => user.id === input.responsableId && user.activo);
      if (!responsible) return NextResponse.json({ error: "El responsable seleccionado no está activo" }, { status: 400 });
      const result = await supabase.from("agreserge_report_annexes").update({
        responsable_id: responsible.id,
        coordinador_id: actor.id,
        updated_at: new Date().toISOString(),
      }).eq("id", input.annexId).select("id").single();
      if (result.error) throw result.error;
      const openPeriods = await supabase.from("agreserge_report_periods")
        .select("id").neq("estado", "Cerrado");
      if (openPeriods.error) throw openPeriods.error;
      const periodIds = (openPeriods.data || []).map((period: any) => period.id);
      let updatedAssignments = 0;
      if (periodIds.length) {
        const submissions = await supabase.from("agreserge_report_submissions").update({
          responsable_id: responsible.id,
          delegado_por_id: actor.id,
          updated_at: new Date().toISOString(),
        }).eq("annex_id", input.annexId).is("parent_id", null).in("period_id", periodIds).select("id");
        if (submissions.error) throw submissions.error;
        updatedAssignments = submissions.data?.length || 0;
        const parentIds = (submissions.data || []).map((item: any) => item.id);
        if (parentIds.length) {
          const children = await supabase.from("agreserge_report_submissions").update({
            delegado_por_id: responsible.id,
            updated_at: new Date().toISOString(),
          }).in("parent_id", parentIds);
          if (children.error) throw children.error;
        }
      }
      return NextResponse.json({
        ok: true,
        responsableId: responsible.id,
        responsableNombre: responsible.nombre,
        updatedAssignments,
      });
    }

    if (input.action === "reorder-obligation" || input.action === "reorder-annex") {
      const order = Number(input.orden);
      if (!input.id || !Number.isFinite(order) || order < 1) {
        return NextResponse.json({ error: "Indique un orden válido mayor o igual a 1" }, { status: 400 });
      }
      const table = input.action === "reorder-obligation"
        ? "agreserge_report_obligations"
        : "agreserge_report_annexes";
      const result = await supabase.from(table).update({
        orden: Math.trunc(order),
        updated_at: new Date().toISOString(),
      }).eq("id", input.id).select("id").single();
      if (result.error) throw result.error;
      const openPeriods = await supabase.from("agreserge_report_periods")
        .select("id").neq("estado", "Cerrado");
      if (openPeriods.error) throw openPeriods.error;
      const periodIds = (openPeriods.data || []).map((period: any) => period.id);
      let reorderedAssignments = 0;
      if (periodIds.length) {
        const submissions = await supabase.from("agreserge_report_submissions")
          .select("id,parent_id,obligation_id,annex_id,orden")
          .in("period_id", periodIds);
        if (submissions.error) throw submissions.error;
        const obligations = await supabase.from("agreserge_report_obligations").select("id,orden");
        const annexes = await supabase.from("agreserge_report_annexes").select("id,orden");
        if (obligations.error) throw obligations.error;
        if (annexes.error) throw annexes.error;
        const obligationOrder = new Map((obligations.data || []).map((item: any) => [item.id, item.orden]));
        const annexOrder = new Map((annexes.data || []).map((item: any) => [item.id, item.orden]));
        for (const submission of submissions.data || []) {
          const childOffset = submission.parent_id ? Math.max(1, Number(submission.orden) % 100) : 0;
          const nextOrder =
            Number(obligationOrder.get(submission.obligation_id) || 1) * 1000 +
            Number(annexOrder.get(submission.annex_id) || 1) * 100 +
            childOffset;
          if (nextOrder !== submission.orden) {
            const update = await supabase.from("agreserge_report_submissions")
              .update({ orden: nextOrder, updated_at: new Date().toISOString() })
              .eq("id", submission.id);
            if (update.error) throw update.error;
            reorderedAssignments += 1;
          }
        }
      }
      return NextResponse.json({
        ok: true,
        orden: Math.trunc(order),
        reorderedAssignments,
      });
    }

    if (input.action === "bootstrap-hgc" || input.action === "bootstrap-entity") {
      const entityId = String(input.entidadId || HGC_ENTITY_ID);
      const config = reportConfigFor(entityId);
      if (!config) {
        return NextResponse.json({ error: "Esta entidad todavía no tiene obligaciones contractuales configuradas" }, { status: 400 });
      }
      await supabase.from("agreserge_entities").upsert({
        id: config.id, nombre: config.name, ciudad: config.city, updated_at: new Date().toISOString(),
      });
      const existing = db.usuarios;
      const adminCoordinator = existing.find((u: any) => ["Coordinadora Administrativa y Financiera", "Coordinación Administrativa"].includes(u.rol));
      const assistanceCoordinator = existing.find((u: any) => u.rol === "Coordinación Asistencial");
      const generalCoordinator = existing.find((u: any) => ["Coordinador General", "Coordinación General", "Director Ejecutivo", "Administrador de Sistemas"].includes(u.rol)) || actor;
      const leaders = entityId === HGC_ENTITY_ID ? [
        ...HGC_ADMIN_LEADERS.map(([nombre, area], index) => ({ nombre, area, group: "administrativo", index })),
        ...HGC_ASSISTANCE_LEADERS.map(([nombre, area], index) => ({ nombre, area, group: "asistencial", index })),
      ] : [];
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
          entidad_id: entityId,
          activo: true,
          cargo: area,
          updated_at: new Date().toISOString(),
        };
      }).map((row) => Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)));
      if (userRows.length) {
        const usersResult = await supabase.from("agreserge_users").upsert(userRows, { onConflict: "id" });
        if (usersResult.error) throw usersResult.error;
      }

      const currentObligationsResult = await supabase.from("agreserge_report_obligations")
        .select("*").eq("entidad_id", entityId);
      if (currentObligationsResult.error) throw currentObligationsResult.error;
      const currentObligations = currentObligationsResult.data || [];
      const currentObligationIds = currentObligations.map((item: any) => item.id);
      const currentAnnexesResult = currentObligationIds.length
        ? await supabase.from("agreserge_report_annexes").select("*").in("obligation_id", currentObligationIds)
        : { data: [], error: null };
      if (currentAnnexesResult.error) throw currentAnnexesResult.error;
      const currentAnnexes = currentAnnexesResult.data || [];
      const activeAnnexIds: string[] = [];
      for (const obligation of config.obligations) {
        const currentObligation = currentObligations.find((item: any) => item.numero === obligation.number);
        const obligationId = currentObligation?.id || randomUUID();
        const obligationResult = await supabase.from("agreserge_report_obligations").upsert({
          id: obligationId, entidad_id: entityId, numero: obligation.number,
          titulo: obligation.title, orden: obligation.number, activa: true, updated_at: new Date().toISOString(),
        }, { onConflict: "entidad_id,numero" });
        if (obligationResult.error) throw obligationResult.error;
        const annexDefinitions = obligation.annexes.length
          ? obligation.annexes
          : [{ number: 0, title: "Soporte directo de la obligación (PDF o Word)" }];
        const annexRows = annexDefinitions.map((annex, index) => {
          const isAdministrative = annex.number === 1 || annex.number === 2;
          const isAssistance = annex.number === 3 || annex.number === 4;
          const current = currentAnnexes.find((item: any) =>
            item.obligation_id === obligationId && item.numero === annex.number);
          return {
            id: current?.id || randomUUID(),
            obligation_id: obligationId,
            numero: annex.number,
            titulo: annex.title,
            orden: current?.orden || index + 1,
            responsable_id: current?.responsable_id || (isAdministrative ? adminCoordinator?.id || generalCoordinator.id : isAssistance ? assistanceCoordinator?.id || generalCoordinator.id : generalCoordinator.id),
            coordinador_id: current?.coordinador_id || (isAdministrative ? adminCoordinator?.id || actor.id : isAssistance ? assistanceCoordinator?.id || actor.id : generalCoordinator.id),
            activa: true,
            updated_at: new Date().toISOString(),
          };
        });
        activeAnnexIds.push(...annexRows.map((row) => row.id));
        if (annexRows.length) {
          const annexResult = await supabase.from("agreserge_report_annexes").upsert(annexRows, { onConflict: "id" });
          if (annexResult.error) throw annexResult.error;
        }
      }
      if (currentAnnexes.length) {
        const obsoleteIds = currentAnnexes
          .filter((item: any) => !activeAnnexIds.includes(item.id))
          .map((item: any) => item.id);
        if (obsoleteIds.length) {
          const deactivate = await supabase.from("agreserge_report_annexes")
            .update({ activa: false, updated_at: new Date().toISOString() })
            .in("id", obsoleteIds);
          if (deactivate.error) throw deactivate.error;
        }
      }
      await supabase.from("agreserge_entities").upsert({
        id: "oficina-agreserge",
        nombre: "Oficina AGRESERGE",
        ciudad: "Valle del Cauca",
        updated_at: new Date().toISOString(),
      });
      return NextResponse.json({
        ok: true,
        usersCreated: userRows.length,
        entity: config.name,
        obligations: config.obligations.length,
        annexes: config.obligations.reduce((total, obligation) => total + obligation.annexes.length, 0),
        directSupports: config.obligations.filter((obligation) => !obligation.annexes.length).length,
      });
    }

    if (input.action === "reset-periods") {
      const entidadId = input.entidadId || HGC_ENTITY_ID;
      const periods = await supabase.from("agreserge_report_periods").select("id").eq("entidad_id", entidadId);
      if (periods.error) throw periods.error;
      const periodIds = (periods.data || []).map((period: any) => period.id);
      let deletedAssignments = 0;
      if (periodIds.length) {
        const submissions = await supabase.from("agreserge_report_submissions")
          .delete().in("period_id", periodIds).select("id");
        if (submissions.error) throw submissions.error;
        deletedAssignments = submissions.data?.length || 0;
      }
      const result = await supabase.from("agreserge_report_periods")
        .delete().eq("entidad_id", entidadId).select("id");
      if (result.error) throw result.error;
      const drive = await resetDrivePeriods();
      return NextResponse.json({
        ok: true,
        deletedPeriods: result.data?.length || 0,
        deletedAssignments,
        archivedDriveFolders: drive.archived || 0,
      });
    }

    if (input.action === "sync-period") {
      const periodResult = await supabase.from("agreserge_report_periods")
        .select("*, entity:agreserge_entities(*)").eq("id", input.periodId).single();
      if (periodResult.error) throw periodResult.error;
      if (periodResult.data.estado === "Cerrado") {
        return NextResponse.json({ error: "No se puede reconstruir un periodo cerrado" }, { status: 400 });
      }
      const synced = await syncPeriodStructure({
        supabase,
        db,
        actor,
        period: periodResult.data,
      });
      const periodUpdate = await supabase.from("agreserge_report_periods").update({
        drive_folder_id: synced.folderId,
        drive_folder_url: synced.folderUrl,
        updated_at: new Date().toISOString(),
      }).eq("id", periodResult.data.id);
      if (periodUpdate.error) throw periodUpdate.error;
      return NextResponse.json({ ok: true, ...synced });
    }

    if (input.action === "open-period") {
      const entidadId = input.entidadId || HGC_ENTITY_ID;
      const entity = db.entidades.find((item: any) => item.id === entidadId) || { id: entidadId, nombre: HGC_ENTITY_NAME };
      const periodId = randomUUID();
      const periodResult = await supabase.from("agreserge_report_periods").insert({
        id: periodId, entidad_id: entidadId, mes: input.mes, anio: Number(input.anio),
        fecha_limite: input.fechaLimite || null, coordinador_id: actor.id,
      }).select("*, entity:agreserge_entities(*)").single();
      if (periodResult.error) throw periodResult.error;
      try {
        const synced = await syncPeriodStructure({
          supabase,
          db,
          actor,
          period: { ...periodResult.data, entity },
        });
        const periodUpdate = await supabase.from("agreserge_report_periods").update({
          drive_folder_id: synced.folderId,
          drive_folder_url: synced.folderUrl,
          updated_at: new Date().toISOString(),
        }).eq("id", periodId);
        if (periodUpdate.error) throw periodUpdate.error;
        return NextResponse.json({
          ok: true,
          periodId,
          folderUrl: synced.folderUrl,
          assignments: synced.total,
        });
      } catch (error) {
        await supabase.from("agreserge_report_periods").delete().eq("id", periodId);
        throw error;
      }
    }

    if (input.action === "cancel-period") {
      const period = await supabase.from("agreserge_report_periods")
        .select("*, entity:agreserge_entities(nombre)")
        .eq("id", input.periodId)
        .single();
      if (period.error) throw period.error;
      if (period.data.estado === "Cerrado") {
        return NextResponse.json(
          { error: "Un periodo cerrado no se puede cancelar" },
          { status: 409 },
        );
      }

      const deleted = await supabase.from("agreserge_report_periods")
        .delete()
        .eq("id", input.periodId)
        .neq("estado", "Cerrado")
        .select("id")
        .single();
      if (deleted.error) throw deleted.error;

      const audit = await supabase.from("agreserge_audit").insert({
        usuario_id: actor.id,
        evento: "Apertura mensual cancelada",
        metadata: {
          period_id: period.data.id,
          entidad_id: period.data.entidad_id,
          entidad: period.data.entity?.nombre,
          mes: period.data.mes,
          anio: period.data.anio,
          drive_folder_id: period.data.drive_folder_id,
          drive_folder_url: period.data.drive_folder_url,
        },
      });
      if (audit.error) throw audit.error;

      return NextResponse.json({
        ok: true,
        periodId: deleted.data.id,
        message: "La apertura mensual y sus asignaciones fueron canceladas.",
      });
    }

    if (input.action === "delegate" || input.action === "reorder") {
      const current = await supabase.from("agreserge_report_submissions")
        .select("responsable_id, delegado_por_id").eq("id", input.id).single();
      if (current.error) throw current.error;
      const ownsAssignment = current.data.responsable_id === actor.id || current.data.delegado_por_id === actor.id;
      if (!canManageReports && !ownsAssignment) {
        return NextResponse.json({ error: "Solo puede modificar los informes que tiene asignados" }, { status: 403 });
      }
      const updates: any = { updated_at: new Date().toISOString() };
      if (input.action === "delegate") {
        updates.responsable_id = input.responsableId;
        updates.delegado_por_id = actor.id;
      } else updates.orden = Number(input.orden);
      const result = await supabase.from("agreserge_report_submissions").update(updates).eq("id", input.id);
      if (result.error) throw result.error;
      return NextResponse.json({ ok: true });
    }

    if (input.action === "create-subreport") {
      const parent = await supabase.from("agreserge_report_submissions")
        .select("*").eq("id", input.parentId).is("parent_id", null).single();
      if (parent.error) throw parent.error;
      const ownsParent = parent.data.responsable_id === actor.id;
      if (!canManageReports && !ownsParent) {
        return NextResponse.json({ error: "Solo el responsable del anexo puede crear sus subinformes" }, { status: 403 });
      }
      const responsible = db.usuarios.find((user: any) => user.id === input.responsableId && user.activo);
      if (!responsible) return NextResponse.json({ error: "Seleccione un responsable activo" }, { status: 400 });
      const title = String(input.titulo || "").trim();
      if (!title) return NextResponse.json({ error: "Escriba el nombre o área del subinforme" }, { status: 400 });
      const siblings = await supabase.from("agreserge_report_submissions")
        .select("orden").eq("parent_id", parent.data.id).order("orden", { ascending: false });
      if (siblings.error) throw siblings.error;
      const requestedOrder = Number(input.orden);
      const order = Number.isFinite(requestedOrder) && requestedOrder > 0
        ? Math.trunc(requestedOrder)
        : Math.max(1, Number(siblings.data?.[0]?.orden || parent.data.orden) + 1);
      const drive = await createDriveSubreport({
        folderId: parent.data.drive_folder_id,
        title,
        responsibleName: responsible.nombre,
        order,
      });
      const inserted = await supabase.from("agreserge_report_submissions").insert({
        id: randomUUID(),
        period_id: parent.data.period_id,
        obligation_id: parent.data.obligation_id,
        annex_id: parent.data.annex_id,
        parent_id: parent.data.id,
        responsable_id: responsible.id,
        delegado_por_id: actor.id,
        titulo: title,
        orden: order,
        estado: "Asignado",
        drive_folder_id: drive.folderId,
        drive_folder_url: drive.folderUrl,
        drive_file_id: drive.id,
        drive_file_url: drive.url,
        updated_at: new Date().toISOString(),
      }).select("*").single();
      if (inserted.error) throw inserted.error;
      return NextResponse.json({ ok: true, submission: inserted.data });
    }

    if (input.action === "delete-subreport") {
      const current = await supabase.from("agreserge_report_submissions")
        .select("*").eq("id", input.id).not("parent_id", "is", null).single();
      if (current.error) throw current.error;
      const canDelete = canManageReports ||
        current.data.delegado_por_id === actor.id ||
        current.data.responsable_id === actor.id;
      if (!canDelete)
        return NextResponse.json({ error: "No tiene permiso para eliminar este subinforme" }, { status: 403 });
      if (["Aprobado", "Con observación"].includes(current.data.estado))
        return NextResponse.json({ error: "El subinforme revisado está bloqueado" }, { status: 423 });
      const deleted = await supabase.from("agreserge_report_submissions")
        .delete().eq("id", input.id).select("id").single();
      if (deleted.error) throw deleted.error;
      return NextResponse.json({ ok: true, deletedId: deleted.data.id });
    }

    if (input.action === "review-submission") {
      if (!canManageReports)
        return NextResponse.json({ error: "Solo coordinación o representación legal puede revisar soportes" }, { status: 403 });
      if (!["Aprobado", "Con observación"].includes(input.estado))
        return NextResponse.json({ error: "Estado de revisión inválido" }, { status: 400 });
      const reviewed = await supabase.from("agreserge_report_submissions").update({
        estado: input.estado,
        observacion: String(input.observacion || "").trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", input.id).select("id,estado,observacion").single();
      if (reviewed.error) throw reviewed.error;
      return NextResponse.json({ ok: true, submission: reviewed.data });
    }

    if (input.action === "close-period") {
      const periodResult = await supabase.from("agreserge_report_periods").select("*, entity:agreserge_entities(*)").eq("id", input.periodId).single();
      if (periodResult.error) throw periodResult.error;
      const submissions = await supabase.from("agreserge_report_submissions").select("*, obligation:agreserge_report_obligations(*), annex:agreserge_report_annexes(*)").eq("period_id", input.periodId).order("orden");
      if (submissions.error) throw submissions.error;
      const reportFileRows = await supabase.from("agreserge_audit")
        .select("metadata").eq("evento", "Archivo múltiple de informe");
      if (reportFileRows.error) throw reportFileRows.error;
      const filesFor = (submissionId: string) => (reportFileRows.data || [])
        .map((row: any) => row.metadata || {})
        .filter((file: any) => file.submission_id === submissionId);
      const items = (submissions.data || []).filter((item: any) => !item.parent_id).map((item: any) => ({
        obligacion: item.obligation.numero, obligacionTitulo: item.obligation.titulo,
        anexo: item.annex?.numero ?? null, titulo: item.titulo, orden: item.orden,
        url: item.drive_file_url || item.archivo_path,
        urls: filesFor(item.id).map((file: any) => ({ nombre: file.nombre, url: file.drive_file_url })),
        responsableNombre: db.usuarios.find((u: any) => u.id === item.responsable_id)?.nombre,
        subitems: (submissions.data || []).filter((sub: any) => sub.parent_id === item.id).map((sub: any) => ({
          titulo: sub.titulo, orden: sub.orden, url: sub.drive_file_url,
          urls: filesFor(sub.id).map((file: any) => ({ nombre: file.nombre, url: file.drive_file_url })),
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
      return NextResponse.json({
        ok: true,
        url: drive.url,
        wordUrl: drive.wordUrl,
        pdfFolderUrl: drive.pdfFolderUrl,
      });
    }

    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No se pudo procesar el informe" }, { status: 500 });
  }
}
