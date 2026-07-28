import hsfObligations from "./hsf-report-config.json";
import hvoObligations from "./hvo-report-config.json";
import {
  HGC_ENTITY_ID,
  HGC_ENTITY_NAME,
  HGC_OBLIGATIONS,
  type HgcObligation,
} from "./hgc-report-config";

export type HospitalReportConfig = {
  id: string;
  name: string;
  city: string;
  obligations: HgcObligation[];
};

export const HSF_ENTITY_ID = "hsf";
export const HVO_ENTITY_ID = "hsv";

export const HOSPITAL_REPORT_CONFIGS: Record<string, HospitalReportConfig> = {
  [HGC_ENTITY_ID]: {
    id: HGC_ENTITY_ID,
    name: HGC_ENTITY_NAME,
    city: "La Unión, Valle del Cauca",
    obligations: HGC_OBLIGATIONS,
  },
  [HSF_ENTITY_ID]: {
    id: HSF_ENTITY_ID,
    name: "Hospital Sagrada Familia E.S.E.",
    city: "Toro, Valle del Cauca",
    obligations: hsfObligations as HgcObligation[],
  },
  [HVO_ENTITY_ID]: {
    id: HVO_ENTITY_ID,
    name: "Hospital Henry Valencia Orozco E.S.E.",
    city: "Versalles, Valle del Cauca",
    obligations: hvoObligations as HgcObligation[],
  },
};

export function reportConfigFor(entityId: string) {
  return HOSPITAL_REPORT_CONFIGS[entityId];
}

export function reportAnnexLabel(entityId: string, annex: { numero?: number | null; titulo?: string }) {
  if (
    entityId === HGC_ENTITY_ID &&
    Number(annex.numero) === 16 &&
    String(annex.titulo || "").includes("16 y 17")
  ) {
    return "Anexo 16 y 17";
  }
  return Number(annex.numero) === 0
    ? "Soporte directo de la obligación"
    : `Anexo ${annex.numero ?? "—"}`;
}
