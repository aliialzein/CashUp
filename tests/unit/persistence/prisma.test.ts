import { PrismaClient } from '../../../src/generated/prisma/client';
import { getPrisma, closePrisma } from '../../../src/shared/db/prisma';
jest.mock('@prisma/adapter-pg', () => ({ PrismaPg: jest.fn() }));
jest.mock('../../../src/generated/prisma/client', () => ({ PrismaClient: jest.fn(() => ({ $disconnect: jest.fn(async () => undefined) })) }));
beforeEach(() => { globalThis.__cashUpPrismaClient = undefined; process.env.DATABASE_URL = 'postgresql://unused/test'; });
afterEach(() => { globalThis.__cashUpPrismaClient = undefined; });
it('returns one runtime client to all callers', () => {
    const first = getPrisma();
    expect(getPrisma()).toBe(first);
    expect(PrismaClient).toHaveBeenCalledTimes(1);
});
it('disconnects once and creates a new shared client after closing', async () => {
    const first = getPrisma();
    const disconnect = Reflect.get(first, '$disconnect');
    await closePrisma();
    await closePrisma();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(getPrisma()).not.toBe(first);
});
