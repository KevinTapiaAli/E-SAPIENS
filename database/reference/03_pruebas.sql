-- REFERENCE TESTS: before running password checks, set app.test_password in a local test session.
-- Pruebas sobre 01 + 02. Todas las mutaciones se revierten al final.
BEGIN;
SET search_path=lms,public;
CREATE TEMP TABLE resultados_pruebas(nombre text,resultado text);
CREATE FUNCTION pg_temp.verificar(nombre text,condicion boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF condicion IS DISTINCT FROM true THEN RAISE EXCEPTION 'FALLÓ: %',nombre; END IF;
INSERT INTO resultados_pruebas VALUES(nombre,'OK'); END $$;
CREATE FUNCTION pg_temp.debe_fallar(nombre text,consulta text,codigo text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE fallo boolean=false; BEGIN
 BEGIN EXECUTE consulta;
 EXCEPTION WHEN OTHERS THEN
 IF SQLSTATE<>codigo THEN RAISE EXCEPTION 'FALLÓ %, esperaba %, obtuvo %: %',nombre,codigo,SQLSTATE,SQLERRM; END IF; fallo=true;
 END;
 IF NOT fallo THEN RAISE EXCEPTION 'FALLÓ %, operación inválida aceptada',nombre; END IF;
 INSERT INTO resultados_pruebas VALUES(nombre,'OK'); END $$;

SELECT pg_temp.verificar('74 tablas',(SELECT count(*) FROM pg_tables WHERE schemaname='lms')=74);
SELECT pg_temp.verificar('19 cuentas',(SELECT count(*) FROM usuarios)=19);
SELECT pg_temp.verificar('Bcrypt de prueba válido',(SELECT password_hash=crypt(current_setting('app.test_password'),password_hash) FROM usuarios WHERE id='3042223f-4bba-5c9a-a5a3-7df6a295abd3'));
SELECT pg_temp.verificar('Clave incorrecta rechazada',(SELECT password_hash<>crypt('incorrecta',password_hash) FROM usuarios WHERE id='3042223f-4bba-5c9a-a5a3-7df6a295abd3'));
SELECT pg_temp.verificar('Primer módulo accesible',puede_acceder_modulo('77859579-671d-5073-961b-b08b5e62eb9a','40579cb8-70f1-5484-84cd-42df21afbec2'));
SELECT pg_temp.verificar('Segundo módulo bloqueado sin progreso',NOT puede_acceder_modulo('77859579-671d-5073-961b-b08b5e62eb9a','d3a86db9-ac31-51b8-b2ee-19d6b084c1cf'));
SELECT pg_temp.verificar('Nota baja permite avanzar por defecto',puede_acceder_modulo('e7320562-b0fb-520d-ae84-856e15c3104c','d3a86db9-ac31-51b8-b2ee-19d6b084c1cf'));
UPDATE reglas_curso SET aprobar_examen=true WHERE curso_id='057be5ab-7978-51f2-95b6-c23115b4d2ad';
SELECT pg_temp.verificar('Modo aprobación bloquea nota baja',NOT puede_acceder_modulo('e7320562-b0fb-520d-ae84-856e15c3104c','d3a86db9-ac31-51b8-b2ee-19d6b084c1cf'));
UPDATE reglas_curso SET aprobar_examen=false WHERE curso_id='057be5ab-7978-51f2-95b6-c23115b4d2ad';
SELECT pg_temp.verificar('Acceso vencido bloqueado',NOT puede_acceder_modulo('7a6759d9-2bda-5a02-828f-042472ed679a','40579cb8-70f1-5484-84cd-42df21afbec2'));
SELECT pg_temp.verificar('Usuario suspendido bloqueado',NOT puede_acceder_modulo('c311bdd5-0a0c-5542-8725-79a9cc7388ce','40579cb8-70f1-5484-84cd-42df21afbec2'));
SELECT pg_temp.verificar('Abandono bloquea acceso',NOT puede_acceder_modulo('bb7e198a-5478-57db-91f2-ddbb1a62d5ce','a10e29c0-09d4-5809-bf00-c9465e114bd8'));
SELECT pg_temp.verificar('Reembolso total revoca cobertura',NOT puede_acceder_modulo('dde7281a-2a5e-5940-a579-9dc5021e85e7','80367c86-04df-5f63-98c1-dd49f9650385'));
SELECT pg_temp.verificar('Reembolso parcial mantiene cobertura',puede_acceder_modulo('92c666ea-7daf-57da-972e-25e6e9831b3a','a10e29c0-09d4-5809-bf00-c9465e114bd8'));
SELECT pg_temp.verificar('Certificado existe para curso completo',EXISTS(SELECT 1 FROM certificados WHERE inscripcion_id=(SELECT id FROM inscripciones WHERE estudiante_id='3042223f-4bba-5c9a-a5a3-7df6a295abd3' AND curso_id='057be5ab-7978-51f2-95b6-c23115b4d2ad')));
SELECT pg_temp.verificar('Porcentaje completo coherente',(SELECT min(porcentaje)=100 FROM v_progreso_modulos WHERE inscripcion_id=(SELECT id FROM inscripciones WHERE estudiante_id='3042223f-4bba-5c9a-a5a3-7df6a295abd3' AND curso_id='057be5ab-7978-51f2-95b6-c23115b4d2ad')));
SELECT pg_temp.verificar('Ingreso BOB neto correcto',(SELECT sum(neto) FROM v_ingresos WHERE moneda='BOB')=2435);
SELECT pg_temp.verificar('Aviso de vencimiento incluye alumno09',EXISTS(SELECT 1 FROM v_accesos_por_vencer WHERE estudiante_id='261c204e-208a-570f-8bab-1b5376d5ec02'));
SELECT pg_temp.verificar('Grabación accesible',puede_ver_grabacion('77859579-671d-5073-961b-b08b5e62eb9a','92dd88c7-0cbf-5e4d-84fa-47707e1a24c0'));
SELECT pg_temp.verificar('Grabación vencida bloqueada por matrícula',NOT puede_ver_grabacion('7a6759d9-2bda-5a02-828f-042472ed679a','92dd88c7-0cbf-5e4d-84fa-47707e1a24c0'));
SELECT pg_temp.verificar('Recurso revisado accesible',puede_ver_recurso('77859579-671d-5073-961b-b08b5e62eb9a','a9ce2c8f-ea03-5f54-8ced-115608c0d5c4'));
SELECT pg_temp.verificar('Biblioteca respeta módulo',puede_ver_biblioteca('77859579-671d-5073-961b-b08b5e62eb9a','5c48578b-5237-5aa5-afe5-4d81b0c77faa'));
SELECT pg_temp.debe_fallar('Correo sin distinción de mayúsculas','UPDATE usuarios SET email=''ESTUDIANTE01@ESAPIENS.EXAMPLE'' WHERE username=''estudiante02''','23505');
SELECT pg_temp.debe_fallar('Progreso de otro curso','INSERT INTO progreso_lecciones(inscripcion_id,curso_id,leccion_id) VALUES((SELECT id FROM inscripciones WHERE estudiante_id=''77859579-671d-5073-961b-b08b5e62eb9a'' AND curso_id=''057be5ab-7978-51f2-95b6-c23115b4d2ad''),''057be5ab-7978-51f2-95b6-c23115b4d2ad'',''8aaf177a-6c0a-57d5-9c6e-69be38b3d014'')','23503');
SELECT pg_temp.debe_fallar('Ciclo de prerrequisitos','INSERT INTO prerrequisitos_curso(curso_id,requerido_id) VALUES(''057be5ab-7978-51f2-95b6-c23115b4d2ad'',''a35ae85f-8ac2-562c-a361-010eb4de0c63'')','P0001');
SELECT pg_temp.debe_fallar('Modificar precio histórico','UPDATE orden_detalles SET precio=1 WHERE orden_id=''562ce10c-d734-596b-8669-6395f65b644e''','P0001');
SELECT pg_temp.debe_fallar('Cambiar propietario de orden','UPDATE ordenes SET usuario_id=''e7320562-b0fb-520d-ae84-856e15c3104c'' WHERE id=''562ce10c-d734-596b-8669-6395f65b644e''','P0001');
SELECT pg_temp.debe_fallar('Eliminar pago confirmado','DELETE FROM pagos WHERE id=''be291de9-ce33-5951-88ba-c1f79d5fd2be''','P0001');
SELECT pg_temp.debe_fallar('Modificar pago confirmado','UPDATE pagos SET monto=1 WHERE id=''be291de9-ce33-5951-88ba-c1f79d5fd2be''','P0001');
SELECT pg_temp.debe_fallar('Borrar auditoría','DELETE FROM auditoria','P0001');
SELECT pg_temp.debe_fallar('Reembolso excede pago','SELECT registrar_reembolso(''be291de9-ce33-5951-88ba-c1f79d5fd2be'',9999,''REF-EXCESO'',''Prueba'',''74fb155c-140e-5255-8f01-c1aeed68cc81'')','P0001');
SELECT pg_temp.debe_fallar('Certificar curso incompleto','SELECT emitir_certificado((SELECT id FROM inscripciones WHERE estudiante_id=''77859579-671d-5073-961b-b08b5e62eb9a'' AND curso_id=''057be5ab-7978-51f2-95b6-c23115b4d2ad''),''e9234feb-2c7d-5236-b1ca-b851bd47e60c'',''74fb155c-140e-5255-8f01-c1aeed68cc81'')','P0001');
SELECT pg_temp.debe_fallar('Registrar progreso bloqueado','SELECT registrar_progreso((SELECT id FROM inscripciones WHERE estudiante_id=''77859579-671d-5073-961b-b08b5e62eb9a'' AND curso_id=''057be5ab-7978-51f2-95b6-c23115b4d2ad''),''4bbe7819-a8d8-5439-a610-2e88f923f8a6'',100,true)','P0001');
SELECT pg_temp.debe_fallar('Registro pendiente no compra','SELECT crear_orden(''5c9dab81-eccd-518a-af10-f79f388c3adf'',ARRAY[''46f54f0c-df0a-5a3f-b448-a6b0f08c827b''::uuid])','P0001');
SELECT pg_temp.debe_fallar('Evento repetido idempotente','INSERT INTO eventos_pago(proveedor_id,evento_externo,firma_validada) VALUES(''0ceca0c5-4660-57b2-ba0a-e81f66e57c81'',''demo-qr-0001'',true)','23505');
SELECT pg_temp.debe_fallar('Intervalos superpuestos','INSERT INTO asistencia_intervalos(asistencia_id,entrada,salida) SELECT ''b08770c1-8e48-5059-88eb-20999a10c22e'',entrada+interval ''1 minute'',salida FROM asistencia_intervalos WHERE asistencia_id=''b08770c1-8e48-5059-88eb-20999a10c22e'' LIMIT 1','P0001');
CREATE TEMP TABLE prueba_orden AS SELECT crear_orden('77859579-671d-5073-961b-b08b5e62eb9a',ARRAY['6e0fc7ad-6506-5b06-839b-f828c2073832'::uuid]) id;
SELECT pg_temp.debe_fallar('Pago de importe incorrecto','INSERT INTO pagos(orden_id,proveedor_id,referencia_externa,metodo,monto,moneda,estado,confirmado_en,confirmado_por) SELECT id,''0ceca0c5-4660-57b2-ba0a-e81f66e57c81'',''TEST-IMPORTE'',''qr'',1,''BOB'',''confirmado'',now(),''74fb155c-140e-5255-8f01-c1aeed68cc81'' FROM prueba_orden','P0001');
SELECT pg_temp.debe_fallar('Pago de moneda incorrecta','INSERT INTO pagos(orden_id,proveedor_id,referencia_externa,metodo,monto,moneda,estado,confirmado_en,confirmado_por) SELECT id,''0ceca0c5-4660-57b2-ba0a-e81f66e57c81'',''TEST-MONEDA'',''qr'',275,''USD'',''confirmado'',now(),''74fb155c-140e-5255-8f01-c1aeed68cc81'' FROM prueba_orden','P0001');
INSERT INTO pagos(orden_id,proveedor_id,referencia_externa,metodo,monto,moneda,estado,confirmado_en,confirmado_por) SELECT id,'0ceca0c5-4660-57b2-ba0a-e81f66e57c81','TEST-OK','qr',275,'BOB','confirmado',now(),'74fb155c-140e-5255-8f01-c1aeed68cc81' FROM prueba_orden;
SELECT pg_temp.verificar('Pago válido activa matrícula y cobertura',puede_acceder_modulo('77859579-671d-5073-961b-b08b5e62eb9a','a10e29c0-09d4-5809-bf00-c9465e114bd8'));
SELECT pg_temp.debe_fallar('Pago repetido no duplica matrícula','INSERT INTO pagos(orden_id,proveedor_id,referencia_externa,metodo,monto,moneda,estado,confirmado_en,confirmado_por) SELECT id,''0ceca0c5-4660-57b2-ba0a-e81f66e57c81'',''TEST-DUP'',''qr'',275,''BOB'',''confirmado'',now(),''74fb155c-140e-5255-8f01-c1aeed68cc81'' FROM prueba_orden','P0001');
SELECT registrar_progreso((SELECT id FROM inscripciones WHERE estudiante_id='57c40446-2359-53f9-b11e-8c9fe3e694d1' AND curso_id='057be5ab-7978-51f2-95b6-c23115b4d2ad'),'ca81729c-03c4-5b7e-ae92-0c97f87fe633',1200,true);
SELECT registrar_progreso((SELECT id FROM inscripciones WHERE estudiante_id='57c40446-2359-53f9-b11e-8c9fe3e694d1' AND curso_id='057be5ab-7978-51f2-95b6-c23115b4d2ad'),'05489caf-35fc-5fd5-9c0a-eac387425b2a',1200,true);
SELECT registrar_progreso((SELECT id FROM inscripciones WHERE estudiante_id='57c40446-2359-53f9-b11e-8c9fe3e694d1' AND curso_id='057be5ab-7978-51f2-95b6-c23115b4d2ad'),'9dda9c38-7867-50b8-adbb-08f88444c68a',1200,true);
CREATE TEMP TABLE prueba_intento AS SELECT iniciar_intento((SELECT id FROM inscripciones WHERE estudiante_id='57c40446-2359-53f9-b11e-8c9fe3e694d1' AND curso_id='057be5ab-7978-51f2-95b6-c23115b4d2ad'),'f4a6466f-99e0-54e4-b78d-7fb980f77f65') id;
SELECT entregar_intento((SELECT id FROM prueba_intento),'[{"pregunta_id": "b50a51ff-e7f9-5d8f-9051-e225f43349af", "opciones": ["673a1d8b-196f-5a1b-8a35-99bc119a7671"]}, {"pregunta_id": "b92504a7-603f-555f-b950-74cd54bd6e95", "opciones": ["5d624dac-898d-568b-9267-88fd18df3166"]}, {"pregunta_id": "74db6ec3-dc86-5c1b-a983-f50ae341e53a", "opciones": ["f0cd2682-4f42-5b1e-b61c-a6f5bf29121c"]}]'::jsonb);
SELECT pg_temp.verificar('Calificación automática 100',(SELECT nota=100 AND estado='calificado' FROM intentos_evaluacion WHERE id=(SELECT id FROM prueba_intento)));
SELECT pg_temp.verificar('Plan básico limita módulos aun completando examen',NOT puede_acceder_modulo('57c40446-2359-53f9-b11e-8c9fe3e694d1','d3a86db9-ac31-51b8-b2ee-19d6b084c1cf'));
SELECT pg_temp.debe_fallar('No entregar dos veces','SELECT entregar_intento((SELECT id FROM prueba_intento),''[]''::jsonb)','P0001');
CREATE TEMP TABLE prueba_intento2 AS SELECT iniciar_intento((SELECT id FROM inscripciones WHERE estudiante_id='77859579-671d-5073-961b-b08b5e62eb9a' AND curso_id='057be5ab-7978-51f2-95b6-c23115b4d2ad'),'f4a6466f-99e0-54e4-b78d-7fb980f77f65') id;
SELECT pg_temp.debe_fallar('Opción de otra pregunta rechazada','SELECT entregar_intento((SELECT id FROM prueba_intento2),''[{"pregunta_id": "b50a51ff-e7f9-5d8f-9051-e225f43349af", "opciones": ["5d624dac-898d-568b-9267-88fd18df3166"]}]''::jsonb)','P0001');
SELECT pg_temp.verificar('Entrega inválida atómica',NOT EXISTS(SELECT 1 FROM respuestas_estudiante WHERE intento_id=(SELECT id FROM prueba_intento2)));
UPDATE intentos_evaluacion SET iniciado_en=now()-interval '1 hour',vence_en=now()-interval '1 minute' WHERE id=(SELECT id FROM prueba_intento2);
SELECT pg_temp.debe_fallar('Intento fuera de tiempo','SELECT entregar_intento((SELECT id FROM prueba_intento2),''[]''::jsonb)','P0001');
SELECT pg_temp.debe_fallar('Archivo de otro alumno no se entrega','SELECT entregar_tarea((SELECT id FROM inscripciones WHERE estudiante_id=''77859579-671d-5073-961b-b08b5e62eb9a'' AND curso_id=''057be5ab-7978-51f2-95b6-c23115b4d2ad''),''16e4a9a0-e4d3-5f89-97fd-178fa848caa9'',''Prueba'',ARRAY[''e6cfcf14-3c7d-52d5-ae07-37e91db5cd21''::uuid])','P0001');
SELECT entregar_tarea((SELECT id FROM inscripciones WHERE estudiante_id='77859579-671d-5073-961b-b08b5e62eb9a' AND curso_id='057be5ab-7978-51f2-95b6-c23115b4d2ad'),'16e4a9a0-e4d3-5f89-97fd-178fa848caa9','Trabajo de prueba');
SELECT pg_temp.verificar('Entrega válida registrada',EXISTS(SELECT 1 FROM entregas_tarea WHERE inscripcion_id=(SELECT id FROM inscripciones WHERE estudiante_id='77859579-671d-5073-961b-b08b5e62eb9a' AND curso_id='057be5ab-7978-51f2-95b6-c23115b4d2ad')));
SELECT * FROM resultados_pruebas ORDER BY nombre;
SELECT count(*) AS pruebas_correctas FROM resultados_pruebas;
ROLLBACK;