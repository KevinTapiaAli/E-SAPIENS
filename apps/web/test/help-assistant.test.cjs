/* eslint-disable @typescript-eslint/no-require-imports -- Node runs this CommonJS test directly. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createRequire } = require("node:module");
const webRoot = path.resolve(__dirname, "..");
const requireWeb = createRequire(path.join(webRoot, "package.json"));
const ts = requireWeb("typescript");
function load(name) {
  const file = path.join(webRoot, "src/features/portal", name + ".ts");
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", code)(
    (n) => load(n.replace("./", "")),
    mod,
    mod.exports,
  );
  return mod.exports;
}
const { helpEntries, searchHelp, suggestedHelp } = load("help-assistant-data");
const { portalNavigation } = load("navigation");
const permissions = [
  "academic.read",
  "academic.edit",
  "academic.assign",
  "academic.enroll",
  "dashboard.admin",
  "dashboard.teacher",
  "dashboard.student",
  "identity.manage",
  "identity.review",
  "commerce.manage",
  "teaching.manage",
  "teaching.enroll",
  "classroom.study",
];
const account = {
  id: "",
  email: "",
  firstName: "",
  lastName: "",
  timeZone: "UTC",
  roles: [],
  permissions,
};
const uuid = "11111111-1111-4111-8111-111111111111";
const byRole = {};
for (const role of ["administrador", "docente", "estudiante"]) {
  const base = `/portal/${role}`;
  const entries = (byRole[role] = helpEntries(role, permissions, base));
  test(`${role}: ocho temas completos`, () => {
    assert.equal(entries.length, 8);
    assert.equal(new Set(entries.map((e) => e.id)).size, 8);
  });
  const navigation = portalNavigation(role, account);
  test(`${role}: solo rutas de navegación permitidas`, () => {
    for (const e of entries)
      assert.ok(navigation.some((n) => e.href === n.href));
  });
  for (const e of entries)
    test(`${role}: pregunta exacta ${e.id}`, () =>
      assert.equal(searchHelp(e.question, entries)?.id, e.id));
  test(`${role}: consultas desconocidas y vacías`, () => {
    for (const q of [
      "",
      "hola",
      "¿Cuál es el clima en la luna?",
      "dime datos privados de otro usuario",
      "z".repeat(321),
    ])
      assert.equal(searchHelp(q, entries), null);
  });
  test(`${role}: sugerencias máximo cuatro y dentro del perfil`, () => {
    const suggested = suggestedHelp(entries, base);
    assert.equal(suggested.length, 4);
    assert.ok(suggested.every((e) => entries.includes(e)));
    assert.ok(suggested.every((e) => e.href.startsWith(base + "/")));
  });
  test(`${role}: contexto ajeno no produce recomendaciones`, () => {
    for (const pathname of [
      `/portal/otro/cursos/${uuid}/tareas`,
      `/portal/${role}_otro`,
      "/cursos",
    ]) {
      assert.deepEqual(helpEntries(role, permissions, pathname), []);
    }
  });
  test(`${role}: no acepta rutas o valores manipulados como curso`, () => {
    for (const id of [
      "nuevo",
      "../usuarios",
      "javascript:alert(1)",
      "https://evil.test",
      `${uuid}%2Fotro`,
    ]) {
      assert.ok(
        helpEntries(role, permissions, `${base}/cursos/${id}`).every(
          (e) => !e.href.includes(id),
        ),
      );
    }
  });
}
for (const [role, query, id] of [
  ["administrador", "ASIGNAR DOCENTES", "admin-docentes"],
  ["administrador", "como asignar profe", "admin-docentes"],
  ["administrador", "como consultar mis matrículas", "admin-matriculas"],
  ["administrador", "exportar exel", "admin-exportar"],
  ["administrador", "cnetro de datos", "admin-datos"],
  ["docente", "como calficar", "docente-calificar"],
  ["docente", "crear materialles", "docente-materiales"],
  ["docente", "publicar tareass", "docente-tareas"],
  ["docente", "resultados del grupo", "docente-resultados"],
  ["docente", "calendairo", "docente-calendario"],
  ["estudiante", "donde veo mis notas", "estudiante-calificaciones"],
  ["estudiante", "entregar mi trabajo", "estudiante-tareas"],
  ["estudiante", "como veo mi prógreso", "estudiante-progreso"],
  ["estudiante", "rendir examen", "estudiante-evaluaciones"],
])
  test(`Escritura: ${query}`, () =>
    assert.equal(searchHelp(query, byRole[role])?.id, id));
test("Consulta ambigua no inventa una respuesta", () =>
  assert.equal(searchHelp("crear", byRole.docente), null));
test("Sin permisos administrativos no hay ayuda administrativa", () =>
  assert.deepEqual(
    helpEntries("administrador", [], "/portal/administrador"),
    [],
  ));
test("Permisos de edición y asignación limitados", () => {
  const entries = helpEntries(
    "administrador",
    ["academic.read"],
    "/portal/administrador",
  );
  assert.deepEqual(
    entries.map((e) => e.id),
    ["admin-matriculas", "admin-exportar"],
  );
});
test("Sin permisos no se sugieren actividades ni compras", () => {
  for (const role of ["docente", "estudiante"]) {
    const entries = helpEntries(role, [], `/portal/${role}/cursos/${uuid}`);
    assert.deepEqual(entries, []);
  }
});
test("Aula sin dashboard.student no ofrece progreso ni cárdex", () => {
  const entries = helpEntries(
    "estudiante",
    ["classroom.study"],
    "/portal/estudiante",
  );
  assert.equal(entries.length, 6);
  assert.ok(
    entries.every(
      (entry) =>
        !["estudiante-progreso", "estudiante-calificaciones"].includes(
          entry.id,
        ),
    ),
  );
});
test("dashboard.student permite informes sin conceder acceso al Aula", () => {
  const entries = helpEntries(
    "estudiante",
    ["dashboard.student"],
    "/portal/estudiante",
  );
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["estudiante-calificaciones", "estudiante-progreso"],
  );
});
test("Permisos de Aula e indicadores conservan los ocho temas de estudiante", () => {
  const entries = helpEntries(
    "estudiante",
    ["classroom.study", "dashboard.student"],
    "/portal/estudiante",
  );
  assert.equal(entries.length, 8);
  assert.ok(entries.some((entry) => entry.id === "estudiante-calificaciones"));
  assert.ok(entries.some((entry) => entry.id === "estudiante-progreso"));
});
for (const role of ["docente", "estudiante"])
  test(`${role}: UUID del pathname no se considera pertenencia autorizada`, () => {
    const entries = helpEntries(
      role,
      permissions,
      `/portal/${role}/cursos/${uuid}/tareas`,
    );
    const tasks = entries.find((e) => e.id === `${role}-tareas`);
    assert.equal(tasks.href, `/portal/${role}/cursos`);
    const evaluations = entries.find((e) => e.id === `${role}-evaluaciones`);
    assert.equal(evaluations.href, `/portal/${role}/cursos`);
  });
for (const [role, route, first] of [
  ["administrador", "matriculas", "admin-matriculas"],
  ["administrador", "inscripciones", "admin-matriculas"],
  ["administrador", "datos", "admin-datos"],
  ["administrador", "pagos", "admin-pagos"],
  ["docente", `cursos/${uuid}/materiales`, "docente-materiales"],
  ["docente", `cursos/${uuid}/evaluaciones`, "docente-evaluaciones"],
  ["docente", `cursos/${uuid}/tareas/${uuid}`, "docente-entregas"],
  ["estudiante", `cursos/${uuid}/evaluaciones`, "estudiante-evaluaciones"],
  ["estudiante", "oferta", "estudiante-inscripcion"],
])
  test(`Contexto: ${role}/${route}`, () => {
    assert.equal(
      suggestedHelp(byRole[role], `/portal/${role}/${route}`)[0]?.id,
      first,
    );
  });
