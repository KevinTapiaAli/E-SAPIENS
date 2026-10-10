import { hash as bcryptHash } from 'bcryptjs';
import { hashPassword, verifyPassword } from './password';

describe('Protección de contraseñas', () => {
  it('usa Argon2id con sal aleatoria y rechaza otra contraseña', async () => {
    const password = 'Una frase larga de prueba 123';
    const first = await hashPassword(password);
    expect(first).toMatch(/^\$argon2id\$/);
    expect(first).not.toEqual(await hashPassword(password));
    expect(await verifyPassword(first, password)).toBe(true);
    expect(await verifyPassword(first, 'otra contraseña')).toBe(false);
  });
  it('acepta bcrypt legado y rechaza hashes inválidos y truncamiento', async () => {
    const password = 'Contraseña anterior de prueba';
    const encoded = await bcryptHash(password, 10);
    expect(await verifyPassword(encoded, password)).toBe(true);
    expect(await verifyPassword('not-a-hash', password)).toBe(false);
    expect(await verifyPassword(encoded, 'a'.repeat(73))).toBe(false);
  });
});
