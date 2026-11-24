import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { courses } from "./demo-content.mjs";

const root = new URL("../", import.meta.url);
process.chdir(fileURLToPath(root));
process.loadEnvFile(".env");
const require = createRequire(new URL("apps/api/package.json", root));
process.env.TS_NODE_PROJECT = fileURLToPath(
  new URL("apps/api/tsconfig.json", root),
);
process.env.TS_NODE_COMPILER = require.resolve("typescript");
require("ts-node/register");
const { hashPassword, verifyPassword } = require(
  fileURLToPath(new URL("apps/api/src/modules/identity/password.ts", root)),
);
const { Client } = require("pg");
const url = new URL(process.env.DATABASE_URL);
if (
  process.env.APP_ENV !== "local" ||
  process.env.NODE_ENV === "production" ||
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  url.pathname !== "/esapiens_demo_local" ||
  url.port !== "55433" ||
  process.env.COMPOSE_PROJECT_NAME !== "esapiens_demo_local"
)
  throw new Error(
    "La demo exige la base aislada esapiens_demo_local en localhost:55433 y su proyecto Docker exclusivo.",
  );
const id = (key) => {
  const s = createHash("sha256")
    .update("esapiens-demo-v1:" + key)
    .digest("hex");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-8${s.slice(17, 20)}-${s.slice(20, 32)}`;
};
const date = (days, hour = 14) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};
const names = [
  ["administrador_general", "Valeria", "Mendoza Ríos", "valeria.mendoza"],
  ["administrador", "Gabriel", "Salinas Vera", "gabriel.salinas"],
  ["docente", "Lucía", "Paredes Soto", "lucia.paredes"],
  ["docente", "Andrés", "Rojas Molina", "andres.rojas"],
  ["docente", "Camila", "Vargas León", "camila.vargas"],
  ["estudiante", "Daniela", "Fuentes Ruiz", "daniela.fuentes"],
  ["estudiante", "Mateo", "Castro Solís", "mateo.castro"],
  ["estudiante", "Sofía", "Navarro Paz", "sofia.navarro"],
  ["estudiante", "Lucas", "Herrera Gil", "lucas.herrera"],
  ["estudiante", "Isabella", "Cabrera Vidal", "isabella.cabrera"],
  ["estudiante", "Sebastián", "Medina Flores", "sebastian.medina"],
  ["estudiante", "Valentina", "Suárez Peña", "valentina.suarez"],
  ["estudiante", "Nicolás", "Aguilar Soto", "nicolas.aguilar"],
  ["estudiante", "Martina", "Reyes Luna", "martina.reyes"],
  ["estudiante", "Santiago", "Morales Díaz", "santiago.morales"],
  ["estudiante", "Emilia", "Torres Alba", "emilia.torres"],
  ["estudiante", "Diego", "Ramos Lara", "diego.ramos"],
  ["estudiante", "Paula", "Vega Campos", "paula.vega"],
  ["estudiante", "Joaquín", "Silva Cruz", "joaquin.silva"],
  ["estudiante", "Renata", "Ortega Marín", "renata.ortega"],
];
const path = "CREDENCIALES_DEMO_LOCAL.txt";
const saved = new Map(
  existsSync(path)
    ? readFileSync(path, "utf8")
        .split("\n")
        .filter((l) => l.includes("@esapiens.test"))
        .map((l) => {
          const p = l.split(" | ");
          return [p[2], p[3]];
        })
    : [],
);
const accounts = names.map(([role, first, last, local]) => ({
  id: id(local),
  role,
  first,
  last,
  email: `${local}@esapiens.test`,
  password:
    saved.get(`${local}@esapiens.test`) ??
    `Es!${randomBytes(15).toString("base64url")}7a`,
}));
const db = new Client({
  connectionString: url.toString(),
  statement_timeout: 30000,
});
let phase = "conexión";
try {
  await db.connect();
  if (
    (await db.query("SELECT current_database() AS name")).rows[0].name !==
    "esapiens_demo_local"
  )
    throw new Error("Base incorrecta.");
  await db.query("BEGIN");
  await db.query("SELECT pg_advisory_xact_lock(712412)");
  await db.query("SELECT set_config('app.actor_id',$1,true)", [accounts[0].id]);
  phase = "cuentas";
  for (const a of accounts) {
    const existing = (
      await db.query(
        "SELECT id,password_hash FROM lms.usuarios WHERE email=$1",
        [a.email],
      )
    ).rows[0];
    if (
      existing &&
      (existing.id !== a.id ||
        !saved.has(a.email) ||
        !(await verifyPassword(existing.password_hash, a.password)))
    )
      throw new Error(
        "Existe una cuenta demo sin credencial local coincidente; se conserva sin sobrescribir.",
      );
    if (!existing) {
      await db.query(
        `INSERT INTO lms.usuarios(id,email,username,nombres,apellidos,password_hash,estado,aprobado_por,aprobado_en,email_verificado_en,motivo_estado,created_at) VALUES($1,$2,$3,$4,$5,$6,'aprobado',$7,$8,$8,'Alta de demostración local autorizada',$8)`,
        [
          a.id,
          a.email,
          "demo-" + a.email.split("@")[0],
          a.first,
          a.last,
          await hashPassword(a.password),
          accounts[0].id,
          date(50),
        ],
      );
      await db.query(
        "INSERT INTO lms.usuario_roles(usuario_id,rol_id,asignado_por) SELECT $1,id,$3 FROM lms.roles WHERE codigo=$2 ON CONFLICT DO NOTHING",
        [a.id, a.role, accounts[0].id],
      );
      await db.query(
        "INSERT INTO lms.historial_estado_usuario(usuario_id,estado_nuevo,responsable_id,motivo) VALUES($1,'aprobado',$2,'Alta de demostración local autorizada')",
        [a.id, accounts[0].id],
      );
    }
  }
  const admin = accounts[0].id,
    teachers = accounts.slice(2, 5),
    students = accounts.slice(5);
  for (const [i, a] of teachers.entries())
    await db.query(
      `INSERT INTO lms.perfiles_docentes(usuario_id,especialidad,biografia,revision_formacion,revisado_por,revisado_en) VALUES($1,$2,$3,'Perfil ficticio revisado para ciclo académico de demostración',$4,now()) ON CONFLICT(usuario_id) DO NOTHING`,
      [
        a.id,
        [
          "Contabilidad y estados financieros",
          "Costos y análisis financiero",
          "Auditoría y control interno",
        ][i],
        `Docente ficticio de práctica. Responsable de ejercicios y acompañamiento en E-SAPIENS.`,
        admin,
      ],
    );
  await db.query(
    "INSERT INTO lms.categorias_curso(id,nombre,slug) VALUES($1,'Contabilidad y Finanzas','demo-contabilidad') ON CONFLICT DO NOTHING",
    [id("category")],
  );
  for (const [ci, c] of courses.entries()) {
    phase = `estructura ${c.title}`;
    const courseId = id(c.slug),
      teacher = teachers[c.teacher].id;
    await db.query(
      `INSERT INTO lms.cursos(id,categoria_id,titulo,slug,descripcion,objetivos,nivel,duracion_horas,estado,creado_por,aprobado_por,aprobado_en,created_at) VALUES($1,$2,$3,$4,$5,$6,'Inicial',24,'publicado',$7,$7,$8,$8) ON CONFLICT DO NOTHING`,
      [
        courseId,
        id("category"),
        c.title,
        "demo-" + c.slug,
        c.description,
        "Comprender los conceptos, resolver casos numéricos y explicar resultados con evidencia.",
        admin,
        date(45),
      ],
    );
    await db.query(
      `INSERT INTO lms.curso_docentes(curso_id,docente_id,principal,asignado_por,motivo,formacion_revisada) VALUES($1,$2,true,$3,'Asignación del ciclo de demostración',$4::jsonb) ON CONFLICT DO NOTHING`,
      [
        courseId,
        teacher,
        admin,
        JSON.stringify({
          especialidad: "Contabilidad",
          revision: "Perfil de demostración revisado",
        }),
      ],
    );
    await db.query(
      "INSERT INTO lms.reglas_curso(curso_id,completar_lecciones,presentar_examen,aprobar_examen) VALUES($1,true,true,false) ON CONFLICT DO NOTHING",
      [courseId],
    );
    c.id = courseId;
    c.modules = [];
    c.lessons = [];
    c.teacherId = teacher;
    for (let mi = 0; mi < 2; mi++) {
      const moduleId = id(c.slug + ":m" + mi),
        topics = c.topics.slice(
          mi === 0 ? 0 : Math.ceil(c.topics.length / 2),
          mi === 0 ? Math.ceil(c.topics.length / 2) : undefined,
        );
      await db.query(
        "INSERT INTO lms.modulos(id,curso_id,titulo,descripcion,orden,publicado) VALUES($1,$2,$3,$4,$5,true) ON CONFLICT DO NOTHING",
        [
          moduleId,
          courseId,
          mi === 0 ? "Fundamentos y registro" : "Aplicación y análisis",
          "Lecturas, caso práctico y evaluación de los conceptos del módulo.",
          mi + 1,
        ],
      );
      const module = {
        id: moduleId,
        lessons: [],
        questions: [],
        task: id(c.slug + ":task" + mi),
        evaluation: id(c.slug + ":evaluation" + mi),
      };
      c.modules.push(module);
      for (const [li, t] of topics.entries()) {
        const lesson = id(c.slug + ":lesson:" + t[0]);
        module.lessons.push(lesson);
        c.lessons.push(lesson);
        const content = `# ${t[0]}\n\n## Concepto\n${t[1]}\n\n## Ejemplo resuelto\n${t[2]}\n\n## Actividad\nReproduce el cálculo en tu cuaderno. Cambia un importe en Bs 100, recalcula y explica el efecto en tres frases. Identifica qué datos necesitas antes de decidir.\n\n## Para recordar\nJustifica cada operación y verifica que los importes y la conclusión sean coherentes.`;
        await db.query(
          "INSERT INTO lms.lecciones(id,curso_id,modulo_id,titulo,tipo,contenido,orden,duracion_minutos,publicada) VALUES($1,$2,$3,$4,'lectura',$5,$6,20,true) ON CONFLICT DO NOTHING",
          [lesson, courseId, moduleId, t[0], content, li + 1],
        );
        const question = id(c.slug + ":question:" + t[0]);
        module.questions.push({
          id: question,
          correct: id(question + ":option0"),
          wrong: id(question + ":option1"),
        });
        await db.query(
          "INSERT INTO lms.preguntas(id,curso_id,tipo,enunciado,explicacion) VALUES($1,$2,'unica',$3,$4) ON CONFLICT DO NOTHING",
          [question, courseId, t[3], t[2]],
        );
        for (const [oi, option] of t[4].entries())
          await db.query(
            "INSERT INTO lms.opciones_pregunta(id,pregunta_id,texto,es_correcta,orden) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
            [id(question + ":option" + oi), question, option, oi === 0, oi + 1],
          );
      }
      const activity = id(c.slug + ":activity" + mi);
      module.lessons.push(activity);
      c.lessons.push(activity);
      await db.query(
        "INSERT INTO lms.lecciones(id,curso_id,modulo_id,titulo,tipo,contenido,orden,duracion_minutos,publicada) VALUES($1,$2,$3,'Taller: resolver y explicar','actividad',$4,$5,30,true) ON CONFLICT DO NOTHING",
        [
          activity,
          courseId,
          moduleId,
          `# Caso integrador\n\nRevisa los ejemplos de ${topics.map((t) => t[0]).join(" y ")}.\n\n1. Identifica los datos y la pregunta de cada caso.\n2. Resuelve los cálculos sin consultar el resultado.\n3. Compara tu solución y explica una diferencia posible.\n4. Redacta una conclusión de cinco líneas para una persona que inicia su negocio.\n\nEntrega tu desarrollo en la tarea del módulo. Se evalúa procedimiento (40 %), cálculos (40 %) y claridad (20 %).`,
          topics.length + 1,
        ],
      );
      await db.query(
        `INSERT INTO lms.tareas(id,curso_id,modulo_id,titulo,instrucciones,fecha_limite,admite_tardia,max_entregas,publicada,creado_por,editado_por,created_at) VALUES($1,$2,$3,$4,$5,$6,true,3,true,$7,$7,$8) ON CONFLICT DO NOTHING`,
        [
          module.task,
          courseId,
          moduleId,
          `Caso práctico ${mi + 1}: ${c.title}`,
          `Resuelve el taller del módulo. Incluye datos, procedimiento, cálculos y conclusión. Rúbrica: procedimiento 40 puntos, exactitud 40, claridad 20. Puedes enviar texto y una nueva versión si corriges tu trabajo.`,
          date(-14),
          teacher,
          date(30),
        ],
      );
      await db.query(
        `INSERT INTO lms.evaluaciones(id,curso_id,modulo_id,titulo,tipo,publicada,nota_minima,intentos_maximos,duracion_minutos) VALUES($1,$2,$3,$4,'modulo',true,60,3,20) ON CONFLICT DO NOTHING`,
        [
          module.evaluation,
          courseId,
          moduleId,
          `Autoevaluación ${mi + 1}: ${c.title}`,
        ],
      );
      for (const [qi, q] of module.questions.entries())
        await db.query(
          "INSERT INTO lms.evaluacion_preguntas(evaluacion_id,curso_id,pregunta_id,puntaje,orden) VALUES($1,$2,$3,1,$4) ON CONFLICT DO NOTHING",
          [module.evaluation, courseId, q.id, qi + 1],
        );
      await db.query(
        `INSERT INTO lms.materiales_docentes(id,curso_id,modulo_id,titulo,tipo,contenido,publicado,creado_por,editado_por) VALUES($1,$2,$3,'Guía de trabajo del módulo','apoyo',$4,true,$5,$5) ON CONFLICT DO NOTHING`,
        [
          id(moduleId + ":material"),
          courseId,
          moduleId,
          `Organiza tu hoja en datos, desarrollo y conclusión. Revisa las lecturas: ${topics.map((t) => t[0]).join(", ")}. Cada ejemplo es ficticio y se expresa en bolivianos.`,
          teacher,
        ],
      );
    }
  }
  phase = "matrículas y actividad";
  for (const [si, s] of students.entries())
    for (const [ci, c] of courses.entries()) {
      if (si >= 3 && ci !== 0 && ci !== 1 + (si % 4)) continue;
      const enrollment = id(s.email + ":" + c.id),
        enrolled = date(40 - si * 2);
      const fresh = await db.query(
        "INSERT INTO lms.inscripciones(id,estudiante_id,curso_id,inscrito_en,created_at) VALUES($1,$2,$3,$4,$4) ON CONFLICT DO NOTHING RETURNING id",
        [enrollment, s.id, c.id, enrolled],
      );
      if (!fresh.rowCount) continue;
      await db.query(
        `INSERT INTO lms.solicitudes_inscripcion(id,estudiante_id,curso_id,estado,revisado_por,revisado_en,motivo,created_at) VALUES($1,$2,$3,'aprobada',$4,$5,'Inscripción aprobada para el ciclo académico ficticio',$6) ON CONFLICT DO NOTHING`,
        [
          id(enrollment + ":request"),
          s.id,
          c.id,
          admin,
          enrolled,
          date(42 - si * 2),
        ],
      );
      const auth = id(enrollment + ":auth");
      await db.query(
        "INSERT INTO lms.autorizaciones_academicas(id,inscripcion_id,autorizado_por,solicitud) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT DO NOTHING",
        [
          auth,
          enrollment,
          admin,
          JSON.stringify({
            reason: "Beca de demostración local",
            modules: c.modules.map((m) => m.id),
          }),
        ],
      );
      for (const m of c.modules)
        await db.query(
          `INSERT INTO lms.accesos_modulo(inscripcion_id,curso_id,modulo_id,autorizado_por,motivo,desde,hasta,autorizacion_id) VALUES($1,$2,$3,$4,'Beca académica de demostración',$5,$6,$7) ON CONFLICT DO NOTHING`,
          [enrollment, c.id, m.id, admin, date(45), date(-180), auth],
        );
      let remaining =
        si % 3 === 0
          ? c.lessons.length
          : si % 3 === 1
            ? Math.floor(c.lessons.length / 2)
            : 1;
      for (const [mi, m] of c.modules.entries()) {
        const accessible = (
          await db.query("SELECT lms.puede_acceder_modulo($1,$2) AS ok", [
            s.id,
            m.id,
          ])
        ).rows[0].ok;
        if (!accessible) continue;
        for (const lesson of m.lessons) {
          if (remaining <= 0) break;
          await db.query("SELECT lms.registrar_progreso($1,$2,1200,true)", [
            enrollment,
            lesson,
          ]);
          await db.query(
            "UPDATE lms.progreso_lecciones SET iniciado_en=$3,completado_en=$4 WHERE inscripcion_id=$1 AND leccion_id=$2",
            [
              enrollment,
              lesson,
              date(7 + (si % 5), 13),
              date(7 + (si % 5), 14),
            ],
          );
          remaining--;
        }
        if (si % 3 !== 2) {
          const delivery = (
            await db.query("SELECT lms.entregar_tarea($1,$2,$3) AS id", [
              enrollment,
              m.task,
              `Datos del caso: ${c.topics[0][2]}\n\nProcedimiento: identifiqué las cuentas o indicadores, ordené los importes y comprobé las operaciones.\n\nConclusión: ${si % 3 === 0 ? "Los resultados concuerdan con el ejemplo; presento cálculo y justificación." : "Presento mi primer desarrollo y solicito revisión del procedimiento."}`,
            ])
          ).rows[0].id;
          await db.query(
            "UPDATE lms.entregas_tarea SET entregado_en=$2 WHERE id=$1",
            [delivery, date(5 + (si % 4))],
          );
          if (si % 3 === 0) {
            await db.query(
              "UPDATE lms.entregas_tarea SET nota=$2,calificado_por=$3,calificado_en=$4 WHERE id=$1",
              [delivery, 88 + (si % 10), c.teacherId, date(3)],
            );
            await db.query(
              "INSERT INTO lms.retroalimentaciones(entrega_id,docente_id,comentario,created_at) VALUES($1,$2,$3,$4)",
              [
                delivery,
                c.teacherId,
                "Buen procedimiento y conclusión clara. Revisa el orden de presentación de los importes.",
                date(3),
              ],
            );
          }
          const attempt = (
            await db.query("SELECT lms.iniciar_intento($1,$2) AS id", [
              enrollment,
              m.evaluation,
            ])
          ).rows[0].id;
          await db.query("SELECT lms.entregar_intento($1,$2::jsonb)", [
            attempt,
            JSON.stringify(
              m.questions.map((q, qi) => ({
                pregunta_id: q.id,
                opciones: [si % 3 === 1 && qi === 0 ? q.wrong : q.correct],
              })),
            ),
          ]);
          await db.query(
            "UPDATE lms.intentos_evaluacion SET iniciado_en=$2,vence_en=$2::timestamptz+interval '20 minutes',entregado_en=$2::timestamptz+interval '8 minutes',calificado_en=$2::timestamptz+interval '8 minutes' WHERE id=$1",
            [attempt, date(4 + (si % 3))],
          );
        }
      }
      if (si >= 12 && ci !== 0)
        await db.query(
          "UPDATE lms.inscripciones SET estado=$2,motivo=$3,abandono_en=CASE WHEN $2='abandonada' THEN now() END WHERE id=$1",
          [
            enrollment,
            ["suspendida", "abandonada", "cancelada"][si - 12],
            "Ejemplo de estado académico para seguimiento",
          ],
        );
    }
  for (let si = 3; si < 6; si++) {
    const c = courses[1 + ((si + 1) % 4)];
    await db.query(
      "INSERT INTO lms.solicitudes_inscripcion(id,estudiante_id,curso_id,created_at) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [id(students[si].email + ":pending"), students[si].id, c.id, date(2)],
    );
  }
  phase = "biblioteca y visitas";
  for (const c of courses) {
    const item = id(c.id + ":book");
    await db.query(
      "INSERT INTO lms.biblioteca_items(id,titulo,tipo,descripcion,editorial,anio,ficha_publica,publicado) VALUES($1,$2,'guia',$3,'E-SAPIENS · Material original de práctica',2026,true,true) ON CONFLICT DO NOTHING",
      [
        item,
        `Guía práctica: ${c.title}`,
        `${c.description} Incluye actividades de ${c.topics.map((t) => t[0]).join(", ")}. Material ficticio para acompañar las lecturas completas disponibles en el aula.`,
      ],
    );
    await db.query(
      "INSERT INTO lms.modulo_biblioteca(modulo_id,item_id,cita) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [
        c.modules[0].id,
        item,
        `E-SAPIENS (2026). Guía práctica: ${c.title}. Material original de demostración.`,
      ],
    );
  }
  await db.query(
    "UPDATE lms.web_analytics_config SET enabled_at=least(enabled_at,$1) WHERE singleton",
    [date(65)],
  );
  for (let day = 1; day <= 45; day++)
    for (let v = 0; v < 4 + (day % 8); v++) {
      const c = courses[v % 5],
        at = date(day),
        hash = createHash("sha256")
          .update("fictional-browser-" + (v + (day % 7)))
          .digest("hex");
      await db.query(
        "INSERT INTO lms.web_visits_daily(day,visitor_hash,resource,course_id,first_seen_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [
          at.toISOString().slice(0, 10),
          hash,
          "/cursos/demo-" + c.slug,
          c.id,
          at,
        ],
      );
    }
  const content =
    "E-SAPIENS — CREDENCIALES EXCLUSIVAS DE LA BASE LOCAL FICTICIA\nReemplazar o desactivar después de la demostración. No subir a Git.\n\nRol | Nombre | Correo | Contraseña | Inicio de sesión\n" +
    accounts
      .map(
        (a) =>
          `${a.role} | ${a.first} ${a.last} | ${a.email} | ${a.password} | http://localhost:3000/login`,
      )
      .join("\n") +
    "\n\nReferencias: Daniela = avance alto; Mateo = intermedio; Sofía = bajo.\n";
  writeFileSync(path + ".tmp", content, { mode: 0o600 });
  // Save generated passwords before commit so a filesystem error cannot strand accounts.
  renameSync(path + ".tmp", path);
  await db.query("COMMIT");
  const stats = await db.query(
    `SELECT (SELECT count(*)::int FROM lms.usuarios) AS cuentas,(SELECT count(*)::int FROM lms.cursos) AS materias,(SELECT count(*)::int FROM lms.inscripciones) AS matriculas,(SELECT count(*)::int FROM lms.lecciones) AS lecciones,(SELECT count(*)::int FROM lms.entregas_tarea) AS entregas,(SELECT count(*)::int FROM lms.intentos_evaluacion) AS evaluaciones_resueltas`,
  );
  console.log(
    "Demo lista. Credenciales guardadas en CREDENCIALES_DEMO_LOCAL.txt (excluido de Git).",
  );
  console.log(stats.rows[0]);
} catch (error) {
  await db.query("ROLLBACK").catch(() => {});
  console.error(
    `No se completó la demo durante ${phase}: ${error instanceof Error ? error.message : "error inesperado"}`,
  );
  process.exitCode = 1;
} finally {
  await db.end();
}
