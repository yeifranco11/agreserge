import { psychologyQuestions } from "./psychology-16pf";

export const PSYCHOLOGY_SCORING_VERSION = "AGRESERGE-PERFIL-DESCRIPTIVO-V1";

type FactorDefinition = {
  code: string;
  name: string;
  lowPole: string;
  highPole: string;
  lowReading: string;
  balancedReading: string;
  highReading: string;
  positive: number[];
  reverse: number[];
};

export type FactorResult = {
  code: string;
  name: string;
  score: number;
  band: "Bajo" | "Intermedio" | "Alto";
  lowPole: string;
  highPole: string;
  reading: string;
  answered: number;
};

export type GlobalResult = {
  code: string;
  name: string;
  score: number;
  band: "Bajo" | "Intermedio" | "Alto";
  lowPole: string;
  highPole: string;
  reading: string;
};

const FACTORS: FactorDefinition[] = [
  { code: "A", name: "Afectividad", lowPole: "Reservado", highPole: "Afable", lowReading: "Tiende a proteger su espacio interpersonal y a vincularse de manera selectiva.", balancedReading: "Alterna cercanía y reserva según la confianza, el contexto y la tarea.", highReading: "Tiende a mostrarse cercano, cooperador y atento a las necesidades de otras personas.", positive: [21,32,34,41,53,62,107,119,126,146,150,159,160,162], reverse: [4,26,64,83,104,110,152,158] },
  { code: "B", name: "Razonamiento", lowPole: "Concreto", highPole: "Analítico", lowReading: "Suele apoyarse en información práctica, directa y verificable para comprender las situaciones.", balancedReading: "Integra razonamiento práctico y análisis conceptual de acuerdo con la exigencia de la situación.", highReading: "Muestra interés por analizar, aprender, relacionar ideas y profundizar en la información.", positive: [43,54,68,71,77,87,88,102,147,148,151], reverse: [19,36,76,86,89,132,154] },
  { code: "C", name: "Estabilidad emocional", lowPole: "Reactivo", highPole: "Estable", lowReading: "Puede experimentar con intensidad la presión o los cambios y beneficiarse de estrategias de regulación.", balancedReading: "Presenta una respuesta emocional generalmente ajustada, con variaciones esperables ante la presión.", highReading: "Tiende a conservar la calma, recuperarse de las dificultades y responder con estabilidad.", positive: [18,55,103,105,114,133,135,145,156], reverse: [3,14,15,40,57,63,70,73,79,81,97,112,120,138,153] },
  { code: "E", name: "Dominancia", lowPole: "Cooperativo", highPole: "Asertivo", lowReading: "Prefiere el acuerdo, la cooperación y considerar la orientación de otras personas.", balancedReading: "Combina cooperación con capacidad para expresar su posición y asumir decisiones.", highReading: "Tiende a expresar con firmeza sus ideas, asumir liderazgo y defender sus decisiones.", positive: [16,27,95,123,124,144,157], reverse: [1,17,101,128] },
  { code: "F", name: "Vivacidad e impulsividad", lowPole: "Sobrio", highPole: "Espontáneo", lowReading: "Tiende a actuar con seriedad, prudencia y preferencia por ambientes moderados.", balancedReading: "Equilibra espontaneidad y prudencia, ajustando su energía a las circunstancias.", highReading: "Suele mostrarse expresivo, entusiasta, dinámico y abierto a experiencias variadas.", positive: [13,28,29,92,94,108,113,122,127,134,136,159], reverse: [20,37,83,100,104,117,131,161] },
  { code: "G", name: "Conciencia de normas", lowPole: "Flexible", highPole: "Normativo", lowReading: "Tiende a evaluar las reglas con flexibilidad y a privilegiar el criterio propio.", balancedReading: "Considera las normas y, a la vez, adapta su aplicación a las circunstancias.", highReading: "Valora el cumplimiento, la responsabilidad y la aplicación consistente de las normas.", positive: [8,11,61,85,115,130], reverse: [12,30,38,42,46] },
  { code: "H", name: "Atrevimiento social", lowPole: "Cauto", highPole: "Socialmente audaz", lowReading: "Suele aproximarse con cautela a situaciones sociales nuevas o de alta exposición.", balancedReading: "Participa socialmente con seguridad moderada y evalúa el contexto antes de exponerse.", highReading: "Tiende a iniciar interacciones, expresarse con seguridad y desenvolverse ante grupos.", positive: [7,27,28,32,92,94,95,113,122,127,159,160], reverse: [23,37,74,93,100,110] },
  { code: "I", name: "Sensibilidad", lowPole: "Pragmático", highPole: "Sensible", lowReading: "Tiende a priorizar criterios objetivos, prácticos y funcionales en sus decisiones.", balancedReading: "Integra consideraciones prácticas con atención a emociones y necesidades humanas.", highReading: "Tiende a percibir matices emocionales, valorar lo estético y responder con empatía.", positive: [5,31,34,41,53,72,81,84,107,126,146], reverse: [4,26,45,64,66,139,149] },
  { code: "L", name: "Vigilancia y suspicacia", lowPole: "Confiado", highPole: "Vigilante", lowReading: "Suele partir de la confianza y atribuir intenciones favorables a otras personas.", balancedReading: "Combina apertura con verificación prudente antes de formar conclusiones.", highReading: "Tiende a examinar con cuidado las intenciones y a protegerse ante posibles riesgos interpersonales.", positive: [40,91,96,99,121,141], reverse: [48,65,72,98,107,155] },
  { code: "M", name: "Imaginación y abstracción", lowPole: "Práctico", highPole: "Imaginativo", lowReading: "Prefiere datos concretos, procedimientos claros y soluciones aplicables.", balancedReading: "Combina imaginación con atención a los requisitos prácticos de la situación.", highReading: "Tiende a explorar posibilidades, ideas novedosas y significados más amplios.", positive: [6,10,31,39,58,59,68,84,102,134,140,148,151], reverse: [2,19,22,36,66,76,78,89,132] },
  { code: "N", name: "Privacidad y astucia social", lowPole: "Abierto", highPole: "Privado", lowReading: "Tiende a comunicar con franqueza sus pensamientos y emociones personales.", balancedReading: "Regula lo que comparte según la confianza y las demandas del contexto.", highReading: "Suele reservar información personal y manejar con discreción su expresión emocional.", positive: [52,56,80,83,100,117,131,152,158], reverse: [7,27,82,90,119,159,162] },
  { code: "O", name: "Aprensión", lowPole: "Seguro", highPole: "Autocrítico", lowReading: "Tiende a confiar en sus recursos y a no permanecer centrado en errores pasados.", balancedReading: "Reconoce sus errores y preocupaciones sin que dominen de forma constante su actuación.", highReading: "Tiende a revisar sus actuaciones, anticipar errores y experimentar preocupación o autocrítica.", positive: [3,17,40,57,63,70,79,81,97,112,120,138,153], reverse: [18,55,103,105,114,133,135,145,156] },
  { code: "Q1", name: "Apertura al cambio", lowPole: "Tradicional", highPole: "Innovador", lowReading: "Valora métodos conocidos, continuidad y referencias establecidas.", balancedReading: "Considera cambios cuando aportan valor, conservando prácticas que han demostrado utilidad.", highReading: "Tiende a cuestionar lo establecido, explorar alternativas y adoptar nuevas formas de actuar.", positive: [24,30,39,46,102,134,140,151], reverse: [8,11,61,85,115,130] },
  { code: "Q2", name: "Autosuficiencia", lowPole: "Orientado al grupo", highPole: "Autosuficiente", lowReading: "Prefiere compartir decisiones, trabajar acompañado y apoyarse en el grupo.", balancedReading: "Alterna autonomía y colaboración según los recursos y objetivos disponibles.", highReading: "Tiende a trabajar por cuenta propia, preservar su independencia y decidir con autonomía.", positive: [9,20,25,69,74,80,100,117,131,137], reverse: [28,94,111,136,146,150,160] },
  { code: "Q3", name: "Autocontrol y organización", lowPole: "Flexible", highPole: "Organizado", lowReading: "Puede privilegiar la espontaneidad y tolerar mayor variación en orden y método.", balancedReading: "Mantiene organización suficiente sin perder capacidad de adaptación.", highReading: "Tiende a planificar, cuidar los detalles y mantener estándares consistentes de ejecución.", positive: [60,67,75,87,106,109,118,130,147], reverse: [13,29,35,49,108,116,142] },
  { code: "Q4", name: "Tensión", lowPole: "Relajado", highPole: "Tenso", lowReading: "Tiende a conservar un ritmo tranquilo y baja activación ante las demandas cotidianas.", balancedReading: "Presenta un nivel de activación funcional, con tensión ocasional ante mayores demandas.", highReading: "Puede mantener un nivel elevado de urgencia, inquietud o activación frente a las exigencias.", positive: [14,15,40,50,63,70,73,79,81,97,112,120,138,153,163], reverse: [18,55,103,105,114,133,135,145,156] },
];

const bandFor = (score: number): "Bajo" | "Intermedio" | "Alto" => score < 4 ? "Bajo" : score < 7 ? "Intermedio" : "Alto";
const round = (value: number) => Number(value.toFixed(1));
const indexFromAverage = (average: number) => round(1 + ((average - 1) / 4) * 9);

function factorScore(definition: FactorDefinition, responses: number[]): FactorResult {
  const values: number[] = [];
  definition.positive.forEach((item) => Number.isFinite(responses[item - 1]) && values.push(responses[item - 1]));
  definition.reverse.forEach((item) => Number.isFinite(responses[item - 1]) && values.push(6 - responses[item - 1]));
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 3;
  const score = indexFromAverage(average);
  const band = bandFor(score);
  return { code: definition.code, name: definition.name, score, band, lowPole: definition.lowPole, highPole: definition.highPole, reading: band === "Bajo" ? definition.lowReading : band === "Alto" ? definition.highReading : definition.balancedReading, answered: values.length };
}

type GlobalDefinition = { code: string; name: string; lowPole: string; highPole: string; items: [string, 1 | -1][]; readings: [string, string, string] };
const GLOBALS: GlobalDefinition[] = [
  { code: "EXT", name: "Extraversión", lowPole: "Introversión", highPole: "Extraversión", items: [["A",1],["F",1],["H",1],["N",-1],["Q2",-1]], readings: ["Tiende a preferir interacciones selectivas, espacios tranquilos y menor exposición social.","Combina participación social con necesidad de espacios propios y reflexión.","Tiende a buscar interacción, expresión abierta y participación activa con otras personas."] },
  { code: "ANS", name: "Ansiedad / activación emocional", lowPole: "Baja activación", highPole: "Alta activación", items: [["C",-1],["L",1],["O",1],["Q4",1]], readings: ["El patrón refleja calma general y baja activación emocional frente a las demandas.","El patrón muestra una activación emocional moderada y sensible al contexto.","El patrón sugiere mayor preocupación, vigilancia o tensión; conviene explorarlo profesionalmente en contexto."] },
  { code: "DUR", name: "Orientación práctica", lowPole: "Receptivo / sensible", highPole: "Práctico / objetivo", items: [["A",-1],["I",-1],["M",-1],["Q1",-1]], readings: ["Tiende a integrar sensibilidad, apertura y consideración de matices personales.","Equilibra criterios humanos y prácticos en su manera de procesar situaciones.","Tiende a priorizar objetividad, utilidad, hechos concretos y procedimientos conocidos."] },
  { code: "IND", name: "Independencia", lowPole: "Acomodaticio", highPole: "Independiente", items: [["E",1],["H",1],["L",1],["Q1",1]], readings: ["Tiende a favorecer cooperación, consenso y adaptación a las expectativas del grupo.","Combina colaboración con capacidad para sostener criterios propios.","Tiende a actuar con autonomía, cuestionar alternativas y sostener con firmeza sus decisiones."] },
  { code: "AUT", name: "Autocontrol", lowPole: "Flexible / espontáneo", highPole: "Controlado / organizado", items: [["G",1],["Q3",1],["F",-1],["M",-1]], readings: ["Tiende a responder con espontaneidad y flexibilidad, con menor énfasis en estructura rígida.","Equilibra planificación, cumplimiento y capacidad de adaptación.","Tiende a organizar, anticipar, regular su conducta y mantener estándares definidos."] },
];

function globalScore(definition: GlobalDefinition, factors: FactorResult[]): GlobalResult {
  const byCode = new Map(factors.map((factor) => [factor.code, factor.score]));
  const values = definition.items.map(([code, direction]) => direction === 1 ? (byCode.get(code) ?? 5.5) : 11 - (byCode.get(code) ?? 5.5));
  const score = round(values.reduce((sum, value) => sum + value, 0) / values.length);
  const band = bandFor(score);
  return { code: definition.code, name: definition.name, score, band, lowPole: definition.lowPole, highPole: definition.highPole, reading: definition.readings[band === "Bajo" ? 0 : band === "Intermedio" ? 1 : 2] };
}

export function scorePsychologyAssessment(input: unknown) {
  const responses = Array.isArray(input) ? input.map(Number).filter((value) => Number.isInteger(value) && value >= 1 && value <= 5) : [];
  const complete = responses.length === psychologyQuestions.length;
  const factors = complete ? FACTORS.map((factor) => factorScore(factor, responses)) : [];
  const globals = complete ? GLOBALS.map((global) => globalScore(global, factors)) : [];
  const counts = [1,2,3,4,5].map((value) => responses.filter((response) => response === value).length);
  const mean = responses.length ? responses.reduce((sum, value) => sum + value, 0) / responses.length : 0;
  const standardDeviation = responses.length ? Math.sqrt(responses.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / responses.length) : 0;
  const dominantShare = responses.length ? Math.max(...counts) / responses.length : 0;
  const qualityStatus = !complete ? "Incompleto" : dominantShare >= 0.8 || standardDeviation < 0.35 ? "Revisar consistencia" : "Patrón interpretable";
  const qualityReading = !complete
    ? `Faltan ${psychologyQuestions.length - responses.length} respuestas para generar la lectura por categorías.`
    : qualityStatus === "Revisar consistencia"
      ? "Se observó poca variación o una alta concentración en una opción. El profesional debe confirmar comprensión, atención y condiciones de aplicación antes de interpretar."
      : "Las respuestas muestran variación suficiente para una lectura descriptiva inicial. Esto no reemplaza controles psicométricos ni entrevista profesional.";
  const ordered = [...factors].sort((a, b) => Math.abs(b.score - 5.5) - Math.abs(a.score - 5.5));
  const highlights = ordered.slice(0, 3).map((factor) => `${factor.name} (${factor.band}, ${factor.score}/10): ${factor.reading}`);
  const explore = factors.filter((factor) => factor.code === "C" || factor.code === "O" || factor.code === "Q4" || factor.code === "L").sort((a,b) => Math.abs(b.score - 5.5) - Math.abs(a.score - 5.5)).slice(0, 3).map((factor) => `${factor.name}: ${factor.reading}`);
  return {
    scoringVersion: PSYCHOLOGY_SCORING_VERSION,
    complete,
    generatedAt: new Date().toISOString(),
    factors,
    globals,
    highlights,
    explore,
    quality: { status: qualityStatus, reading: qualityReading, answered: responses.length, total: psychologyQuestions.length, completion: round((responses.length / psychologyQuestions.length) * 100), standardDeviation: round(standardDeviation), dominantResponseShare: round(dominantShare * 100) },
    disclaimer: "Lectura descriptiva institucional construida a partir de las respuestas. No corresponde al algoritmo, baremos ni puntajes oficiales del 16PF y no constituye diagnóstico clínico, selección automática ni decisión laboral. Requiere integración y firma de un profesional de Psicología.",
  };
}

