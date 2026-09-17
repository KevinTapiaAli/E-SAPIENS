-- Consultas de ejemplo. Cambia el username, nunca confíes en un ID enviado por el navegador.
SET search_path=lms,public;

-- 1. Cuentas y roles (no devuelve hashes).
SELECT u.username,u.email,u.nombres,u.apellidos,u.estado,string_agg(r.codigo,', ' ORDER BY r.codigo) roles
FROM usuarios u JOIN usuario_roles ur ON ur.usuario_id=u.id JOIN roles r ON r.id=ur.rol_id GROUP BY u.id ORDER BY u.username;

-- 2. Catálogo público y cobertura de productos.
SELECT * FROM v_catalogo_publico ORDER BY titulo;
SELECT p.nombre,p.tipo,p.precio,p.moneda,p.dias_acceso,c.titulo curso,m.titulo modulo,m.orden
FROM planes_acceso p JOIN plan_modulos pm ON pm.plan_id=p.id JOIN modulos m ON m.id=pm.modulo_id JOIN cursos c ON c.id=m.curso_id
WHERE p.activo ORDER BY p.nombre,c.titulo,m.orden;

-- 3. Aula de Luis: el segundo módulo se habilita pese a su nota 33.33.
SELECT c.titulo curso,m.titulo modulo,m.orden,v.porcentaje,
 modulo_completado(i.id,m.id) modulo_completado,puede_acceder_modulo(u.id,m.id) acceso_permitido
FROM usuarios u JOIN inscripciones i ON i.estudiante_id=u.id JOIN cursos c ON c.id=i.curso_id JOIN modulos m ON m.curso_id=c.id
LEFT JOIN v_progreso_modulos v ON v.inscripcion_id=i.id AND v.modulo_id=m.id
WHERE u.username='estudiante02' ORDER BY c.titulo,m.orden;

-- 4. Progreso por alumno/módulo y panel de cursos.
SELECT u.username,c.titulo curso,v.titulo modulo,v.lecciones_completadas,v.lecciones_requeridas,v.porcentaje
FROM v_progreso_modulos v JOIN inscripciones i ON i.id=v.inscripcion_id JOIN usuarios u ON u.id=i.estudiante_id JOIN cursos c ON c.id=v.curso_id
ORDER BY c.titulo,u.username,v.orden;
SELECT * FROM v_dashboard_cursos ORDER BY titulo;

-- 5. Ingresos: nunca sumar BOB y USD en una misma cifra sin conversión documentada.
SELECT * FROM v_ingresos ORDER BY mes,moneda;
SELECT * FROM v_flujo_caja ORDER BY mes,moneda;
SELECT o.numero,u.username,o.total,o.moneda,o.estado FROM v_totales_orden o JOIN usuarios u ON u.id=o.usuario_id ORDER BY o.numero;

-- 6. Próximas clases: el enlace solo se devuelve después de comprobar acceso.
SELECT s.titulo,s.inicia_en,s.termina_en,s.plataforma,s.enlace_privado
FROM sesiones_clase s JOIN usuarios u ON u.username='estudiante02'
WHERE s.estado='programada' AND s.inicia_en>now() AND puede_acceder_modulo(u.id,s.modulo_id)
ORDER BY s.inicia_en;

-- 7. Biblioteca: metadatos públicos separados de autorización del archivo.
SELECT b.titulo,b.editorial,b.anio,s.titulo tema,s.pagina_inicio,s.pagina_fin,
 puede_ver_biblioteca(u.id,b.id) puede_abrir_material
FROM biblioteca_items b JOIN biblioteca_secciones s ON s.item_id=b.id
JOIN usuarios u ON u.username='estudiante03'
WHERE b.ficha_publica AND b.publicado ORDER BY b.titulo,s.orden;

-- 8. Grabaciones: la API obtiene clave_objeto solo después de este filtro.
SELECT g.id,g.disponible_hasta,s.titulo,g.permite_descarga
FROM grabaciones_clase g JOIN sesiones_clase s ON s.id=g.sesion_id JOIN usuarios u ON u.username='estudiante03'
WHERE puede_ver_grabacion(u.id,g.id);

-- 9. Asistencia docente y estudiantil.
SELECT s.titulo,u.username,a.tipo,a.minutos_conectado,a.minutos_programados
FROM v_asistencia a JOIN usuarios u ON u.id=a.usuario_id JOIN sesiones_clase s ON s.id=a.sesion_id ORDER BY s.titulo,a.tipo;

-- 10. Calificaciones, tareas y certificado del estudiante.
SELECT e.titulo,u.username,it.numero,it.estado,it.nota
FROM intentos_evaluacion it JOIN evaluaciones e ON e.id=it.evaluacion_id JOIN inscripciones i ON i.id=it.inscripcion_id
JOIN usuarios u ON u.id=i.estudiante_id ORDER BY u.username,e.titulo;
SELECT t.titulo,u.username,et.numero,et.entregado_en,et.nota
FROM entregas_tarea et JOIN tareas t ON t.id=et.tarea_id JOIN inscripciones i ON i.id=et.inscripcion_id JOIN usuarios u ON u.id=i.estudiante_id;
SELECT codigo,nombre_snapshot,curso_snapshot,horas_snapshot,emitido_en,revocado_en FROM certificados;

-- 11. Avisos, revisión y auditoría administrativa.
SELECT u.username,m.titulo,v.vence_en FROM v_accesos_por_vencer v JOIN usuarios u ON u.id=v.estudiante_id JOIN modulos m ON m.id=v.modulo_id;
SELECT id,estado,observacion FROM revisiones_contenido WHERE estado IN ('pendiente','observado');
SELECT ocurrido_en,actor_id,tabla,accion,campos FROM auditoria ORDER BY ocurrido_en DESC LIMIT 50;

-- 12. Dataset pseudonimizado de resultados autorizados para análisis, sin emails.
-- Un UUID sigue siendo dato vinculable. Aplicar consentimiento y retención.
SELECT * FROM v_resultados_ia;
