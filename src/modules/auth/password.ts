import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export function hashPassword(plainText: string) {
  return bcrypt.hash(plainText, BCRYPT_ROUNDS);
}

export function verifyPassword(plainText: string, hash: string) {
  return bcrypt.compare(plainText, hash);
}
