import { connection } from 'next/server';

export async function runDynamicRoute<T>(handler: () => Promise<T>): Promise<T> {
  await connection();
  return handler();
}
