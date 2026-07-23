export type HgcAnnex = {
  number: number;
  title: string;
};

export type HgcObligation = {
  number: number;
  title: string;
  annexes: HgcAnnex[];
};

export const HGC_ENTITY_ID = "hgc";
export const HGC_ENTITY_NAME = "Hospital Gonzalo Contreras E.S.E.";

export const HGC_OBLIGATIONS: HgcObligation[] = [
  { number: 1, title: "Prestar el servicio objeto del contrato sindical en forma continua, oportuna, eficiente y bajo su propia responsabilidad y autonomía, autogestión, colaboración y autorregulación en la ejecución y apoyo en los procesos asistenciales y administrativos.", annexes: [
    { number: 1, title: "Informe de actividades realizadas en los procesos administrativos" },
    { number: 2, title: "Informe de actividades administrativas AGRESERGE del Valle" },
    { number: 3, title: "Informe de actividades realizadas en los procesos asistenciales" },
    { number: 4, title: "Informe de actividades asistenciales AGRESERGE del Valle" },
  ]},
  { number: 2, title: "Cumplir con los estándares de habilitación aplicables a la gestión y administración del talento humano.", annexes: [{ number: 5, title: "Base de datos del personal y certificaciones de habilitación vigentes" }] },
  { number: 3, title: "Organizar y garantizar que los procesos y subprocesos contratados sean desarrollados por su personal.", annexes: [{ number: 6, title: "Base de datos del personal y convenios suscritos con vigencia" }] },
  { number: 4, title: "Gestionar las novedades del personal: vacaciones, permisos, incapacidades, licencias y afiliaciones a la seguridad social.", annexes: [
    { number: 7, title: "Informe mensual de vacaciones otorgadas" },
    { number: 8, title: "Informe mensual de permisos concedidos" },
    { number: 9, title: "Informe mensual de incapacidades" },
    { number: 10, title: "Informe mensual de afiliaciones a seguridad social en salud" },
  ]},
  { number: 5, title: "Promover y garantizar el bienestar laboral de los agremiados mediante acciones planificadas.", annexes: [{ number: 11, title: "Plan de bienestar laboral e informe mensual de ejecución" }] },
  { number: 6, title: "Ejecutar selección, inducción y reinducción del personal agremiado.", annexes: [
    { number: 12, title: "Relación de agremiados vinculados durante el mes" },
    { number: 13, title: "Registro de inducción específica al área o servicio" },
    { number: 14, title: "Resultados de entrevistas y evaluación de conocimientos" },
  ]},
  { number: 7, title: "Garantizar la capacitación continua del personal agremiado.", annexes: [{ number: 15, title: "Plan de capacitación e informe mensual de ejecución" }] },
  { number: 8, title: "Aplicar los formatos, guías y protocolos institucionales de la E.S.E.", annexes: [] },
  { number: 9, title: "Organizar las actividades de los agremiados y garantizar las pólizas de responsabilidad exigidas.", annexes: [
    { number: 16, title: "Póliza de responsabilidad civil extracontractual" },
    { number: 17, title: "Base de datos de pólizas de responsabilidad civil de agremiados" },
  ]},
  { number: 10, title: "Dar trámite oportuno a las glosas trasladadas por el Hospital.", annexes: [] },
  { number: 11, title: "Entregar el manual de actividades de afiliados técnicos y profesionales.", annexes: [{ number: 18, title: "Manual de actividades (entrega única)" }] },
  { number: 12, title: "No ceder el contrato.", annexes: [{ number: 19, title: "Certificación de no cesión del contrato" }] },
  { number: 13, title: "Vincular y pagar la seguridad social de los agremiados.", annexes: [{ number: 20, title: "Planilla de pago de seguridad social del mes anterior" }] },
  { number: 14, title: "Desarrollar, implementar y hacer seguimiento al programa de Seguridad y Salud en el Trabajo.", annexes: [{ number: 21, title: "Plan SST e informe mensual de ejecución, incidentes y accidentes" }] },
  { number: 15, title: "Responder por dinero y bienes bajo custodia y destinarlos exclusivamente al contrato.", annexes: [{ number: 22, title: "Paz y salvo de agremiados desvinculados durante el mes" }] },
  { number: 16, title: "Carnetizar a los agremiados.", annexes: [{ number: 23, title: "Base de datos con estado de carnetización" }] },
  { number: 17, title: "Garantizar normas de comportamiento, conducta, seguridad y mecanismos correctivos.", annexes: [{ number: 24, title: "Actas de seguimiento a conductas y comportamientos" }] },
  { number: 18, title: "Asistir a reuniones convocadas por el Hospital y atender sus requerimientos.", annexes: [] },
  { number: 19, title: "Contar con reserva de recurso humano para suplir vacancias.", annexes: [{ number: 25, title: "Solicitudes de cubrimiento de personal" }] },
  { number: 20, title: "Facilitar los controles implementados por los supervisores del contrato.", annexes: [] },
  { number: 21, title: "Presentar informes mensuales de ejecución y atender de inmediato las observaciones.", annexes: [] },
  { number: 22, title: "Asumir costos, gastos e inversiones para cumplir el objeto contractual.", annexes: [{ number: 26, title: "Informe de costos del personal, viáticos, turnos, horas extra, incapacidades y nómina" }] },
  { number: 23, title: "Cumplir las acciones de mejoramiento del PAMEC.", annexes: [{ number: 27, title: "Informe PAMEC" }] },
  { number: 24, title: "Responder por demandas, reclamos, quejas, peticiones, sanciones y procesos derivados de la ejecución contractual.", annexes: [] },
];

export const HGC_ADMIN_LEADERS = [
  ["Ángela Rosa Gaviria", "Facturación"],
  ["Yeider Zahovic Franco", "Tecnología de la información"],
  ["David Andrés Bueno", "Tecnología de la información · PYMS / OPS"],
  ["Gustavo Gordillo", "Tecnología de la información · Sistemas / OPS"],
  ["Jessica Quintero", "Almacén"],
  ["Yeimy Janelly Girón", "Gerencia"],
  ["Luisa Fernanda Guapacha", "Contabilidad"],
  ["Stefany Hincapié Londoño", "Activos fijos"],
  ["Luis Alberto García", "Contratación"],
  ["José Isdael Giraldo", "Gestión de la infraestructura"],
  ["Luisa Fernanda Salazar Marín", "Gestión ambiental"],
  ["Sebastián Rubio", "Tecnología de la información · Comunicaciones"],
  ["Yency Exadis Garzón", "Calidad"],
  ["Stefany Rojas Monsalve", "Costos"],
  ["Luz Nidia Florez", "Talento humano"],
] as const;

export const HGC_ASSISTANCE_LEADERS = [
  ["Diana Sofía Isaza C.", "Farmacia"],
  ["Dora Viviana Gómez R.", "RX"],
  ["Santiago M. Ríos", "Fisioterapia"],
  ["Jaime Muriel García", "Conductores"],
  ["John Ferley Gutiérrez G.", "Consulta externa"],
  ["Leidy Viviana García S.", "SIAU"],
  ["Luisa Fernanda Salazar M.", "Auxiliar de enfermería · Hospitalización"],
  ["Cristian Fabriani Escobar", "Auxiliar de enfermería · Urgencias"],
  ["Daniela Madrid Castillo", "Laboratorio"],
  ["Cristina Colonia Arango", "Médicos generales · Urgencias"],
  ["Yasmín Viviana Ríos M.", "Odontología"],
  ["Camilo Andrés Herrera", "Referencia"],
  ["Angélica Lorena Vidarte G.", "PMYS"],
] as const;
