import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { Client } from 'pg';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from '../modules/identity/identity.dto';
import { hashPassword } from '../modules/identity/password';

async function main(): Promise<void> {
  if (!process.stdin.isTTY)
    throw new Error(
      'Ejecuta esta herramienta en una terminal interactiva. No pases contraseñas como argumentos.',
    );
  const env = resolve('../../.env');
  if (existsSync(env)) process.loadEnvFile(env);
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.');
  const role = process.argv[2];
  if (
    ![
      'estudiante',
      'docente',
      'administrador',
      'administrador_general',
    ].includes(role)
  )
    throw new Error(
      'Uso: pnpm account:create estudiante|docente|administrador|administrador_general',
    );
  let muted = false;
  const output = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const input = createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  let dto: RegisterDto;
  let specialty = '';
  try {
    console.log(
      `Alta aprobada de ${role}. Operador: verifica el correo y la autorización institucional antes de continuar.`,
    );
    const email = await input.question('Correo: ');
    const firstName = await input.question('Nombres: ');
    const lastName = await input.question('Apellidos: ');
    if (role === 'docente')
      specialty = (await input.question('Especialidad: ')).trim();
    process.stdout.write('Contraseña (15–128 caracteres, entrada oculta): ');
    muted = true;
    const password = await input.question('');
    process.stdout.write('\nRepite la contraseña: ');
    const confirm = await input.question('');
    muted = false;
    process.stdout.write('\n');
    if (password !== confirm) throw new Error('Las contraseñas no coinciden.');
    dto = plainToInstance(RegisterDto, {
      email,
      firstName,
      lastName,
      password,
    });
    if (
      (await validate(dto)).length ||
      (role === 'docente' && (!specialty || specialty.length > 200))
    )
      throw new Error(
        'Datos inválidos. Revisa correo, nombres, especialidad y longitud de contraseña.',
      );
  } finally {
    input.close();
  }
  const passwordHash = await hashPassword(dto.password);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 3000,
  });
  try {
    await client.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(712411)');
    const result = await client.query<{ id: string }>(
      'SELECT id FROM lms.roles WHERE codigo=$1',
      [role],
    );
    if (!result.rows[0])
      throw new Error('Ejecuta pnpm db:migrate antes de crear cuentas.');
    const exists = await client.query(
      'SELECT id FROM lms.usuarios WHERE email=$1',
      [dto.email],
    );
    if (exists.rowCount)
      throw new Error(
        'El correo ya existe. No se sobrescribieron datos ni permisos.',
      );
    const id = randomUUID();
    await client.query("SELECT set_config('app.actor_id',$1,true)", [id]);
    await client.query(
      `INSERT INTO lms.usuarios(id,email,username,nombres,apellidos,password_hash,estado,aprobado_por,aprobado_en,motivo_estado)
      VALUES($1,$2,$3,$4,$5,$6,'aprobado',$1,now(),'Alta autorizada mediante CLI del operador')`,
      [id, dto.email, `u-${id}`, dto.firstName, dto.lastName, passwordHash],
    );
    await client.query(
      'INSERT INTO lms.usuario_roles(usuario_id,rol_id,asignado_por) VALUES($1,$2,$1)',
      [id, result.rows[0].id],
    );
    if (role === 'docente')
      await client.query(
        'INSERT INTO lms.perfiles_docentes(usuario_id,especialidad) VALUES($1,$2)',
        [id, specialty],
      );
    await client.query(
      "INSERT INTO lms.historial_estado_usuario(usuario_id,estado_nuevo,responsable_id,motivo) VALUES($1,'aprobado',$1,'Alta autorizada mediante CLI del operador')",
      [id],
    );
    await client.query('COMMIT');
    console.log(
      `Cuenta creada con perfil ${role}. Ya puede iniciar sesión. No se marcó el correo como verificado.`,
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  // Do not print pg details: they may include a row containing a password hash.
  console.error(
    error instanceof Error && !('code' in error)
      ? error.message
      : 'No se pudo crear la cuenta. Comprueba conexión, migraciones y datos.',
  );
  process.exitCode = 1;
});
