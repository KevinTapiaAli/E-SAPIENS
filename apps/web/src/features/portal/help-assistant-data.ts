import type { WorkspaceRole } from "@esapiens/contracts";
import { portalNavigation, type PortalSection } from "./navigation";

export type HelpEntry = {
  id: string;
  question: string;
  answer: string;
  href: string;
  actionLabel: string;
};

type HelpTopic = Omit<HelpEntry, "href"> & {
  section: PortalSection;
  permission?: string;
  courseSection?: "materiales" | "tareas" | "evaluaciones";
  keywords: string;
  contexts: string[];
};

// Curated from the existing portal forms and routes. These entries describe
// actions; the assistant never calls the APIs that perform those actions.
const topics: Record<WorkspaceRole, HelpTopic[]> = {
  administrador: [
    {
      id: "admin-usuarios",
      question: "¿Cómo crear usuarios?",
      answer:
        "En Usuarios, abre Crear una cuenta. Completa nombre, correo, contraseña inicial, perfil y motivo. Para un docente, registra también su especialidad y revisión de formación. La cuenta queda aprobada al confirmarse el guardado; solo el administrador general puede crear administradores.",
      section: "usuarios",
      permission: "identity.manage",
      actionLabel: "Abrir Usuarios",
      keywords:
        "crear usuario usuarios cuenta cuentas alta registrar persona personas",
      contexts: ["/usuarios"],
    },
    {
      id: "admin-solicitudes",
      question: "¿Cómo revisar solicitudes de cuenta?",
      answer:
        "Abre Solicitudes de cuenta y revisa los datos de la persona. Registra la decisión y su motivo en la tarjeta correspondiente. Las solicitudes de inscripción a materias se consultan en Inscripciones y las decide el docente asignado.",
      section: "solicitudes",
      actionLabel: "Revisar solicitudes de cuenta",
      keywords:
        "revisar aprobar rechazar solicitudes solicitud acceso cuentas pendientes registro",
      contexts: ["/solicitudes"],
    },
    {
      id: "admin-docentes",
      question: "¿Cómo asignar docentes a materias?",
      answer:
        "En Docentes y asignaciones, revisa la formación del docente. Abre Asignar docente a un curso, elige docente y materia, escribe el motivo y confirma que su formación es adecuada. Guarda la asignación y espera la confirmación.",
      section: "docentes",
      permission: "academic.assign",
      actionLabel: "Abrir Docentes y asignaciones",
      keywords:
        "asignar asignacion asignaciones docente docentes profesor profesores profe especialidad",
      contexts: ["/docentes"],
    },
    {
      id: "admin-materias",
      question: "¿Cómo administrar materias?",
      answer:
        "En Materias y temarios puedes crear una materia o abrir una existente. Revisa sus datos, requisitos y publicación; organiza módulos y lecciones en Temario y contenido. Los docentes se asignan desde Docentes y asignaciones.",
      section: "cursos",
      permission: "academic.edit",
      actionLabel: "Abrir Materias y temarios",
      keywords:
        "administrar crear editar publicar materia materias curso cursos modulo modulos leccion temario",
      contexts: ["/cursos"],
    },
    {
      id: "admin-matriculas",
      question: "¿Cómo consultar matrículas y autorizaciones?",
      answer:
        "En Matrículas y acceso, busca por estudiante o materia y abre el registro para consultar módulos y vigencia. Registrar una matrícula no registra un pago ni concede por sí solo acceso a materiales privados. En Inscripciones puedes consultar las decisiones de los docentes.",
      section: "matriculas",
      actionLabel: "Abrir Matrículas y acceso",
      keywords:
        "matricula matriculas inscripcion inscripciones autorizacion autorizaciones acceso vigencia habilitar estudiantes inscritos",
      contexts: ["/matriculas", "/inscripciones"],
    },
    {
      id: "admin-datos",
      question: "¿Cómo utilizar el Centro de Datos?",
      answer:
        "El Centro de Datos reúne Resumen, Estudiantes, Cursos, Docentes, Actividad web y Reportes. Elige una vista y aplica los filtros antes de interpretar indicadores. En Estudiantes, una fila representa una matrícula: una persona puede aparecer en varias materias. Sin datos no equivale a cero.",
      section: "datos",
      actionLabel: "Abrir Centro de Datos",
      keywords:
        "centro datos indicadores estadisticas graficos resumen interpretar actividad web reportes",
      contexts: ["/datos"],
    },
    {
      id: "admin-exportar",
      question: "¿Cómo exportar informes?",
      answer:
        "En Usuarios puedes descargar estudiantes en Excel y en Docentes y asignaciones la lista de docentes. Aplica primero la búsqueda y los filtros: la descarga los respeta. Si tienes acceso al Centro de Datos, también puedes exportar sus resultados en CSV.",
      section: "usuarios",
      actionLabel: "Abrir listas para exportar",
      keywords:
        "exportar exporto descargar descarga informe informes reporte reportes excel xlsx csv listas",
      contexts: ["/datos", "/usuarios", "/docentes", "/informes"],
    },
    {
      id: "admin-pagos",
      question: "¿Cómo revisar pagos manuales?",
      answer:
        "En Pagos y planes, revisa la orden, importe, referencia y método de cada pago pendiente. Verifica el ingreso en el banco antes de aprobar; registra la decisión y su motivo. La confirmación registra los accesos de forma transaccional. El asistente no verifica ni confirma pagos.",
      section: "pagos",
      actionLabel: "Abrir Pagos y planes",
      keywords:
        "pago pagos manual manuales banco transferencia comprobante referencia aprobar planes pendientes",
      contexts: ["/pagos"],
    },
  ],
  docente: [
    {
      id: "docente-materias",
      question: "¿Cómo consultar mis materias asignadas?",
      answer:
        "Abre Mis aulas y selecciona una de tus materias. Desde allí accedes a materiales, tareas, evaluaciones y estudiantes. En la materia también puedes exportar sus estudiantes a Excel; en Mis estudiantes puedes consultar avances y filtrar por materia.",
      section: "cursos",
      permission: "teaching.manage",
      actionLabel: "Abrir Mis aulas",
      keywords:
        "materia materias asignadas asignados curso cursos aulas estudiantes inscritos exportar excel xlsx",
      contexts: ["/cursos", "/materias", "/seguimiento"],
    },
    {
      id: "docente-materiales",
      question: "¿Cómo crear materiales?",
      answer:
        "Abre una materia asignada y entra en Materiales y referencias. Despliega Añadir material, selecciona el módulo y completa título, contenido o enlace. Revisa la opción de publicación y guarda. Espera el mensaje de confirmación antes de salir.",
      section: "cursos",
      permission: "teaching.manage",
      courseSection: "materiales",
      actionLabel: "Abrir materiales de esta materia",
      keywords:
        "crear material materiales referencias recurso recursos contenido enlace enlaces publicar apoyo apoyos",
      contexts: ["/materiales"],
    },
    {
      id: "docente-tareas",
      question: "¿Cómo publicar tareas?",
      answer:
        "Dentro de tu materia, abre Tareas y entregas y despliega Crear tarea. Completa módulo, título, instrucciones, fecha límite e intentos; elige si aceptas entregas tardías. Marca Publicar tarea para estudiantes con acceso y guarda. La fecha del formulario usa la zona horaria del dispositivo.",
      section: "cursos",
      permission: "teaching.manage",
      courseSection: "tareas",
      actionLabel: "Abrir tareas de esta materia",
      keywords:
        "crear publicar tarea tareas actividad actividades consigna consignas trabajo trabajos fecha limite",
      contexts: ["/tareas"],
    },
    {
      id: "docente-entregas",
      question: "¿Cómo revisar entregas?",
      answer:
        "En Tareas y entregas, abre la tarea para consultar los envíos, intentos, fechas y comentarios de tus estudiantes. Puedes abrir el enlace al trabajo si lo incluyeron y responder con retroalimentación. Inicio del Aula virtual destaca entregas que requieren atención.",
      section: "cursos",
      permission: "teaching.manage",
      courseSection: "tareas",
      actionLabel: "Abrir tareas y entregas",
      keywords:
        "revisar entrega entregas envio envios corregir trabajos retroalimentacion comentarios pendientes revision",
      contexts: ["/tareas/", "/seguimiento"],
    },
    {
      id: "docente-calificar",
      question: "¿Cómo calificar una entrega?",
      answer:
        "Abre una tarea y localiza la entrega del estudiante. Introduce su calificación en el formulario correspondiente y guarda; puedes añadir retroalimentación. Espera la confirmación real. Una entrega sin nota se muestra como Pendiente, y las notas se expresan sobre 100.",
      section: "cursos",
      permission: "teaching.manage",
      courseSection: "tareas",
      actionLabel: "Abrir tareas para calificar",
      keywords:
        "calificar calificacion calificaciones nota notas puntaje puntuar corregir entrega",
      contexts: ["/tareas/", "/seguimiento"],
    },
    {
      id: "docente-evaluaciones",
      question: "¿Cómo crear evaluaciones?",
      answer:
        "En una materia asignada, abre Evaluaciones y el formulario Publicar evaluación. Elige un módulo publicado y completa título, minutos, intentos, nota mínima y preguntas de selección única con su respuesta correcta. Revisa todo antes de guardar: la evaluación se publica al confirmarse el guardado.",
      section: "cursos",
      permission: "teaching.manage",
      courseSection: "evaluaciones",
      actionLabel: "Abrir evaluaciones de esta materia",
      keywords:
        "crear publicar evaluacion evaluaciones examen examenes prueba pruebas preguntas opciones intentos",
      contexts: ["/evaluaciones"],
    },
    {
      id: "docente-resultados",
      question: "¿Cómo consultar resultados de evaluaciones?",
      answer:
        "En Evaluaciones de tu materia, pulsa Ver resultados del grupo en la evaluación que quieras revisar. Allí aparecen los intentos y resultados autorizados. En Mis estudiantes también puedes consultar avance y notas disponibles de las materias a tu cargo.",
      section: "cursos",
      permission: "teaching.manage",
      courseSection: "evaluaciones",
      actionLabel: "Abrir resultados de evaluaciones",
      keywords:
        "consultar resultados resultado grupo rendimiento intentos resueltos estadisticas",
      contexts: ["/evaluaciones", "/informes"],
    },
    {
      id: "docente-calendario",
      question: "¿Cómo utilizar el calendario?",
      answer:
        "Abre Mi agenda para elegir Mes, Semana o Próximos, filtrar actividades y ver el detalle de un día. Hoy vuelve a la fecha actual. Puedes crear recordatorios personales y descargar el período en .ics. Los feriados disponibles son informativos y no cambian plazos ni clases.",
      section: "agenda",
      actionLabel: "Abrir Mi agenda",
      keywords:
        "calendario agenda evento eventos recordatorio recordatorios clases semana mes feriados ics",
      contexts: ["/agenda"],
    },
  ],
  estudiante: [
    {
      id: "estudiante-materias",
      question: "¿Cómo consultar mis materias?",
      answer:
        "En Mis aulas puedes abrir tus materias para estudiar. Materias inscritas muestra el registro de tus materias y su estado. Si una materia o módulo está bloqueado, consulta el motivo de acceso que se muestra y contacta con la administración si necesitas revisarlo.",
      section: "cursos",
      permission: "classroom.study",
      actionLabel: "Abrir Mis aulas",
      keywords:
        "materia materias curso cursos aulas inscritas inscrito bloqueado bloqueada acceso",
      contexts: ["/cursos", "/materias"],
    },
    {
      id: "estudiante-inscripcion",
      question: "¿Cómo solicitar una inscripción?",
      answer:
        "Abre Inscribirme, busca una materia y envía su solicitud con el motivo solicitado. El docente asignado aprueba o rechaza la solicitud. Después, administración habilita los módulos y su vigencia; la aprobación por sí sola no garantiza acceso a todos los contenidos.",
      section: "oferta",
      permission: "classroom.study",
      actionLabel: "Abrir Inscribirme",
      keywords:
        "solicitar inscripcion inscribirme inscribir matricula matricularme oferta autorizacion solicitud",
      contexts: ["/oferta"],
    },
    {
      id: "estudiante-lecciones",
      question: "¿Cómo acceder a las lecciones?",
      answer:
        "Abre una materia en Mis aulas y busca un módulo Disponible. Pulsa Abrir lección o Continuar estudiando. Al terminar, usa Marcar como completada cuando esté habilitado. Un módulo bloqueado muestra su motivo y puede requerir autorización vigente o aprobar una evaluación anterior.",
      section: "cursos",
      permission: "classroom.study",
      actionLabel: "Abrir Mis aulas",
      keywords:
        "leccion lecciones contenido contenidos estudiar lectura leer modulo modulos completar completada",
      contexts: ["/lecciones/", "/materiales"],
    },
    {
      id: "estudiante-tareas",
      question: "¿Cómo entregar tareas?",
      answer:
        "En tu materia, entra en Tareas y entregas y abre la tarea. Revisa instrucciones, plazo e intentos; en Enviar mi trabajo escribe una respuesta o un enlace HTTPS y, si quieres, un comentario. Confirma el envío y espera el resultado: cada envío confirmado consume un intento.",
      section: "cursos",
      permission: "classroom.study",
      courseSection: "tareas",
      actionLabel: "Abrir tareas de esta materia",
      keywords:
        "entregar tarea tareas trabajo trabajos enviar envio envios respuesta enlace comentario entrega",
      contexts: ["/tareas"],
    },
    {
      id: "estudiante-calificaciones",
      question: "¿Cómo consultar mis calificaciones?",
      answer:
        "Abre una tarea para consultar la nota y comentarios de tus entregas; Pendiente significa que aún no tienen calificación. En Evaluaciones verás tu mejor nota y estado de intentos. Mi cárdex reúne los indicadores académicos disponibles; no todos se calculan si faltan registros.",
      section: "informes",
      permission: "dashboard.student",
      actionLabel: "Abrir Mi cárdex",
      keywords:
        "calificacion calificaciones nota notas cardex kardex puntaje aprobado reprobado resultados",
      contexts: ["/informes", "/tareas/"],
    },
    {
      id: "estudiante-evaluaciones",
      question: "¿Cómo responder evaluaciones?",
      answer:
        "En Evaluaciones de tu materia, revisa minutos e intentos y pulsa Comenzar / recuperar intento. Al empezar corre el plazo y se consume un intento. Selecciona las respuestas y pulsa Entregar y calificar antes del vencimiento. Las respuestas sin enviar no se guardan al recargar; las omitidas valen cero.",
      section: "cursos",
      permission: "classroom.study",
      courseSection: "evaluaciones",
      actionLabel: "Abrir evaluaciones de esta materia",
      keywords:
        "responder rendir evaluacion evaluaciones examen examenes prueba pruebas comenzar intento intentos",
      contexts: ["/evaluaciones"],
    },
    {
      id: "estudiante-progreso",
      question: "¿Cómo consultar mi progreso?",
      answer:
        "En Mi progreso puedes consultar tus indicadores y aplicar los filtros disponibles. Dentro de cada materia también verás las lecciones completadas y pendientes. Completar lecturas no sustituye los requisitos de evaluación ni amplía la vigencia de acceso a los módulos.",
      section: "progreso",
      permission: "dashboard.student",
      actionLabel: "Abrir Mi progreso",
      keywords:
        "progreso avance avances porcentaje indicadores completado pendiente pendientes seguimiento",
      contexts: ["/progreso"],
    },
    {
      id: "estudiante-compras",
      question: "¿Cómo visualizar compras e inscripciones?",
      answer:
        "En Planes y mis compras puedes consultar tus órdenes, pagos y estados. Para pagar, sigue las instrucciones institucionales y registra la referencia: el acceso se habilita después de la revisión. En Materias inscritas puedes consultar tus materias. Si aún no tienes acceso, pide a administración que revise la autorización y vigencia.",
      section: "pagos",
      permission: "classroom.study",
      actionLabel: "Abrir Planes y mis compras",
      keywords:
        "compras compra pagos pago planes orden ordenes historial recibo referencia inscripciones matriculas",
      contexts: ["/pagos"],
    },
  ],
};

const topicById = new Map(
  Object.values(topics).flatMap((entries) =>
    entries.map((entry) => [entry.id, entry] as const),
  ),
);
export function helpEntries(
  role: WorkspaceRole,
  permissions: readonly string[],
  pathname: string,
): HelpEntry[] {
  const base = `/portal/${role}`;
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return [];
  // Navigation only consumes permissions. Supply an empty, non-personal user
  // instead of fetching or retaining any identity data for help content.
  const navigation = portalNavigation(role, {
    id: "",
    email: "",
    firstName: "",
    lastName: "",
    timeZone: "UTC",
    roles: [role],
    permissions: [...permissions],
  });
  return topics[role].flatMap((topic) => {
    const target = navigation.find((item) => item.section === topic.section);
    if (
      !target ||
      (topic.permission && !permissions.includes(topic.permission))
    )
      return [];
    return [
      {
        id: topic.id,
        question: topic.question,
        answer: topic.answer,
        // A pathname alone cannot prove course membership. Link to the permitted
        // course list; its existing API enforces assignments/enrollments.
        href: target.href,
        actionLabel: topic.courseSection
          ? "Elegir una materia en Mis aulas"
          : topic.actionLabel,
      },
    ];
  });
}

export function suggestedHelp(
  entries: HelpEntry[],
  pathname: string,
): HelpEntry[] {
  return entries
    .map((entry, order) => {
      const contexts = topicById.get(entry.id)?.contexts ?? [];
      const contextScore = Math.max(
        0,
        ...contexts.map((context) => {
          const index = pathname.indexOf(context);
          const end = index + context.length;
          return index >= 0 &&
            (context.endsWith("/") ||
              end === pathname.length ||
              pathname[end] === "/")
            ? context.length
            : 0;
        }),
      );
      return { entry, order, score: contextScore };
    })
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 4)
    .map(({ entry }) => entry);
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const ignoredWords = new Set(
  "a al algo ante aqui ayuda ayuden ayudame buen buenas buenos cual cuales como con consultar consulto de del desde donde el ella en es esta estan este esto hacer hago hay hola la las lo los me mi mis mirar miro mostrar muestra necesito nos para puedo puede que quiero se si son soy su sus tengo un una unas unos usar utilizar ver veo y yo por favor e sapiens esapiens".split(
    " ",
  ),
);

function words(value: string): string[] {
  return [
    ...new Set(
      normalize(value)
        .split(" ")
        .filter((word) => word && !ignoredWords.has(word)),
    ),
  ];
}

// Small bounded edit distance: tolerates missing/replaced letters and a common
// adjacent-key transposition, without a dependency or external request.
function nearby(a: string, b: string): boolean {
  const limit = Math.min(a.length, b.length) >= 8 ? 2 : 1;
  if (Math.min(a.length, b.length) < 4 || Math.abs(a.length - b.length) > limit)
    return false;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  let beforePrevious = previous;
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        current[j] = Math.min(current[j], beforePrevious[j - 2] + 1);
    }
    beforePrevious = previous;
    previous = current;
  }
  return previous[b.length] <= limit;
}

export function searchHelp(
  query: string,
  entries: HelpEntry[],
): HelpEntry | null {
  if (query.length > 320) return null;
  const terms = words(query);
  if (!terms.length) return null;
  const ranked = entries
    .map((entry) => {
      const vocabulary = words(
        `${entry.question} ${topicById.get(entry.id)?.keywords ?? ""}`,
      );
      const score =
        terms.reduce(
          (total, term) =>
            total +
            (vocabulary.includes(term)
              ? 1
              : vocabulary.some((word) => nearby(term, word))
                ? 0.8
                : 0),
          0,
        ) / terms.length;
      return { entry, score };
    })
    .sort((a, b) => b.score - a.score);
  const first = ranked[0];
  if (
    !first ||
    first.score < 0.6 ||
    (ranked[1] && first.score - ranked[1].score < 0.1)
  )
    return null;
  return first.entry;
}
