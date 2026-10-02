-- Contenido ficticio exclusivo de local/test. Usar pnpm db:seed:demo.
-- La transacción y las restricciones de entorno se aplican desde scripts/database.mjs.
DO $$ BEGIN
  IF current_setting('app.allow_demo_seed', true) IS DISTINCT FROM 'enabled' THEN
    RAISE EXCEPTION 'Ejecutar mediante db:seed:demo en un entorno local';
  END IF;
END $$;

-- Cuenta técnica suspendida, sin roles y con valor aleatorio no utilizable como hash de login.
INSERT INTO lms.usuarios(id,email,username,nombres,apellidos,password_hash,estado)
VALUES ('e5a00000-0000-4000-8000-000000000001','demo-editor@esapiens.example','demo_editor_esapiens',
  'Editor de demostración','Sin acceso',encode(gen_random_bytes(48),'hex'),'suspendido')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lms.categorias_curso(id,nombre,slug) VALUES
('e5a00000-0000-4000-8000-000000000010','Ciencias naturales','demo-ciencias'),
('e5a00000-0000-4000-8000-000000000011','Lenguaje y estudio','demo-lenguaje')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lms.cursos(id,categoria_id,titulo,slug,descripcion,objetivos,nivel,duracion_horas,estado,creado_por,aprobado_por,aprobado_en) VALUES
('e5a00000-0000-4000-8000-000000000101','e5a00000-0000-4000-8000-000000000010',
 '[Demostración] Ciencias naturales','demo-ciencias-naturales',
 'Contenido ficticio para presentar el funcionamiento de E-SAPIENS. Explora los seres vivos y su relación con el ambiente.',
 'Reconocer las características de los seres vivos. Identificar relaciones entre organismos y ecosistemas.','Inicial',12,'publicado',
 'e5a00000-0000-4000-8000-000000000001','e5a00000-0000-4000-8000-000000000001',now()),
('e5a00000-0000-4000-8000-000000000102','e5a00000-0000-4000-8000-000000000011',
 '[Demostración] Lectura comprensiva','demo-lectura-comprensiva',
 'Contenido ficticio para la demostración. Practica estrategias para comprender y organizar ideas a partir de una lectura.',
 'Identificar ideas principales y secundarias. Elaborar un resumen con palabras propias.','Inicial',8,'publicado',
 'e5a00000-0000-4000-8000-000000000001','e5a00000-0000-4000-8000-000000000001',now()),
('e5a00000-0000-4000-8000-000000000103','e5a00000-0000-4000-8000-000000000011',
 '[Demostración] Técnicas de estudio','demo-tecnicas-estudio',
 'Contenido ficticio para la demostración. Organiza tus sesiones de aprendizaje y consulta fuentes bibliográficas.',
 'Planificar sesiones de estudio. Registrar referencias de los materiales consultados.','Inicial',6,'publicado',
 'e5a00000-0000-4000-8000-000000000001','e5a00000-0000-4000-8000-000000000001',now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO lms.modulos(id,curso_id,titulo,descripcion,orden,publicado) VALUES
('e5a00000-0000-4000-8000-000000000201','e5a00000-0000-4000-8000-000000000101','Los seres vivos','Introducción a las ciencias naturales.',1,true),
('e5a00000-0000-4000-8000-000000000202','e5a00000-0000-4000-8000-000000000101','Los ecosistemas','Relaciones en el ambiente.',2,true),
('e5a00000-0000-4000-8000-000000000203','e5a00000-0000-4000-8000-000000000102','Comprender un texto','Estrategias de lectura.',1,true),
('e5a00000-0000-4000-8000-000000000204','e5a00000-0000-4000-8000-000000000103','Organizar el aprendizaje','Planificación y fuentes.',1,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lms.lecciones(id,curso_id,modulo_id,titulo,tipo,orden,duracion_minutos,publicada) VALUES
('e5a00000-0000-4000-8000-000000000301','e5a00000-0000-4000-8000-000000000101','e5a00000-0000-4000-8000-000000000201','Características de los seres vivos','lectura',1,25,true),
('e5a00000-0000-4000-8000-000000000302','e5a00000-0000-4000-8000-000000000101','e5a00000-0000-4000-8000-000000000201','La célula como unidad de vida','lectura',2,30,true),
('e5a00000-0000-4000-8000-000000000303','e5a00000-0000-4000-8000-000000000101','e5a00000-0000-4000-8000-000000000202','Relaciones entre los seres vivos','actividad',1,35,true),
('e5a00000-0000-4000-8000-000000000304','e5a00000-0000-4000-8000-000000000102','e5a00000-0000-4000-8000-000000000203','Ideas principales y secundarias','lectura',1,25,true),
('e5a00000-0000-4000-8000-000000000305','e5a00000-0000-4000-8000-000000000103','e5a00000-0000-4000-8000-000000000204','Plan de estudio semanal','actividad',1,20,true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lms.autores(id,nombre) VALUES
('e5a00000-0000-4000-8000-000000000401','Equipo editorial de demostración') ON CONFLICT (id) DO NOTHING;
INSERT INTO lms.biblioteca_items(id,titulo,tipo,descripcion,editorial,anio,ficha_publica,publicado) VALUES
('e5a00000-0000-4000-8000-000000000501','[Demostración] Guía de ciencias naturales','guia',
 'Ficha ficticia para mostrar temas y referencias. No corresponde a una publicación comercial ni incluye un archivo descargable.','Editorial de demostración',2026,true,true),
('e5a00000-0000-4000-8000-000000000502','[Demostración] Cuaderno de lectura','guia',
 'Ficha ficticia que ilustra la organización de una biblioteca. Los materiales oficiales serán proporcionados por E-SAPIENS.','Editorial de demostración',2026,true,true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO lms.biblioteca_autores(id,item_id,autor_id,orden) VALUES
('e5a00000-0000-4000-8000-000000000601','e5a00000-0000-4000-8000-000000000501','e5a00000-0000-4000-8000-000000000401',1),
('e5a00000-0000-4000-8000-000000000602','e5a00000-0000-4000-8000-000000000502','e5a00000-0000-4000-8000-000000000401',1)
ON CONFLICT (id) DO NOTHING;
INSERT INTO lms.biblioteca_secciones(id,item_id,titulo,orden,pagina_inicio,pagina_fin) VALUES
('e5a00000-0000-4000-8000-000000000701','e5a00000-0000-4000-8000-000000000501','Seres vivos y clasificación',1,1,12),
('e5a00000-0000-4000-8000-000000000702','e5a00000-0000-4000-8000-000000000501','Ecosistemas y ambiente',2,13,24),
('e5a00000-0000-4000-8000-000000000703','e5a00000-0000-4000-8000-000000000502','Lectura y organización de ideas',1,1,10)
ON CONFLICT (id) DO NOTHING;
