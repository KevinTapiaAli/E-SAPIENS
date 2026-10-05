-- Opcional: contenido didáctico ficticio. Ejecutar solo con db:seed:classroom.
DO $$ BEGIN
 IF current_setting('app.allow_demo_seed',true) IS DISTINCT FROM 'enabled' THEN
  RAISE EXCEPTION 'Ejecutar mediante db:seed:classroom en local/test';
 END IF;
END $$;

-- Solo completa campos vacíos de lecciones demo identificadas. Nunca sustituye textos existentes.
UPDATE lms.lecciones l SET contenido=demo.contenido
FROM (VALUES
 ('e5a00000-0000-4000-8000-000000000301'::uuid, $text$LECTURA DE DEMOSTRACIÓN · E-SAPIENS

Características de los seres vivos

Los seres vivos están formados por una o más células. Obtienen materia y energía del ambiente, regulan sus procesos internos y responden a estímulos. También forman parte de poblaciones que cambian a través de las generaciones.

Observa una planta cercana. Sus hojas reciben luz, sus raíces absorben agua y sus células utilizan nutrientes. Estos procesos se relacionan: un cambio en la cantidad de agua puede afectar su crecimiento.

Actividad de reflexión
1. Elige un ser vivo que conozcas.
2. Describe cómo obtiene agua o alimento.
3. Identifica un cambio del ambiente al que responde.

Cuando termines la lectura, registra tu avance y continúa con la siguiente lección.

Este contenido breve es un ejemplo para presentar el aula; no constituye un programa académico validado.$text$),
 ('e5a00000-0000-4000-8000-000000000302'::uuid, $text$LECTURA DE DEMOSTRACIÓN · E-SAPIENS

La célula como unidad de vida

La célula es la unidad estructural y funcional de los seres vivos. Una membrana delimita su interior y regula el intercambio con el ambiente. En su interior ocurren reacciones necesarias para mantener la vida.

Algunos organismos están formados por una sola célula. Otros, como las plantas y los animales, tienen muchas células que se organizan y cumplen funciones especializadas.

Para pensar
¿Por qué un organismo necesita intercambiar materia y energía con su ambiente? Escribe una explicación con tus propias palabras.

Al completar las dos lecturas de este módulo podrás continuar al siguiente, siempre que tengas autorización vigente y se cumplan las reglas del curso.

Contenido ficticio preparado exclusivamente para demostrar el funcionamiento de E-SAPIENS.$text$),
 ('e5a00000-0000-4000-8000-000000000303'::uuid, $text$ACTIVIDAD DE DEMOSTRACIÓN · E-SAPIENS

Relaciones entre los seres vivos

Un ecosistema incluye seres vivos y factores físicos, como el agua, la luz y el suelo. Los organismos se relacionan entre sí y con estos factores.

Observa un jardín, parque o fotografía de un ambiente natural. En tu cuaderno:
1. Identifica tres seres vivos y dos factores físicos.
2. Describe una relación entre dos organismos.
3. Explica qué podría cambiar si disminuye el agua disponible.

Marca la actividad como completada cuando termines tu reflexión. Este botón registra avance personal; no envía una tarea ni asigna una calificación.

Ejemplo ficticio para la presentación del aula.$text$),
 ('e5a00000-0000-4000-8000-000000000304'::uuid, $text$LECTURA DE DEMOSTRACIÓN · E-SAPIENS

Ideas principales y secundarias

La idea principal expresa el tema central de un párrafo. Las ideas secundarias aportan detalles, explicaciones o ejemplos que ayudan a comprenderla.

Texto de práctica
Organizar el tiempo facilita el estudio. Una agenda permite distribuir las tareas durante la semana. Reservar pausas y revisar lo aprendido también ayuda a mantener una rutina.

Actividad
Identifica la idea central del texto. Después escribe dos detalles que la apoyen y prepara un resumen de una oración.

Registra la lección como completada al terminar. Material ficticio para demostrar el sistema.$text$),
 ('e5a00000-0000-4000-8000-000000000305'::uuid, $text$ACTIVIDAD DE DEMOSTRACIÓN · E-SAPIENS

Plan de estudio semanal

Define un objetivo pequeño y concreto para esta semana. Divide el objetivo en tareas y asigna un horario realista a cada una.

En tu cuaderno prepara una tabla con: día, materia, objetivo y tiempo previsto. Incluye una sesión final para revisar lo aprendido y ajustar el siguiente plan.

Antes de marcar la actividad como completada, responde: ¿qué harás si una tarea necesita más tiempo del previsto?

Esta actividad registra avance personal. No envía un archivo ni produce una nota. Contenido ficticio de demostración.$text$)
) AS demo(id,contenido)
WHERE l.id=demo.id AND nullif(btrim(l.contenido),'') IS NULL
 AND EXISTS(SELECT 1 FROM lms.cursos c WHERE c.id=l.curso_id AND c.slug IN ('demo-ciencias-naturales','demo-lectura-comprensiva','demo-tecnicas-estudio') AND c.creado_por='e5a00000-0000-4000-8000-000000000001'::uuid);

-- Regla expresa únicamente para estos cursos ficticios: avanzar al completar lecturas.
-- Si alguien ya configuró las reglas del curso, se preservan.
INSERT INTO lms.reglas_curso(curso_id,completar_lecciones,presentar_examen,aprobar_examen)
SELECT id,true,false,false FROM lms.cursos
WHERE id IN ('e5a00000-0000-4000-8000-000000000101','e5a00000-0000-4000-8000-000000000102','e5a00000-0000-4000-8000-000000000103')
 AND slug IN ('demo-ciencias-naturales','demo-lectura-comprensiva','demo-tecnicas-estudio')
 AND creado_por='e5a00000-0000-4000-8000-000000000001'::uuid
ON CONFLICT(curso_id) DO NOTHING;
