describe('HTTP composition root', () => {
  beforeEach(() => {
    globalThis.__cashUpHttpDependencies = undefined;
    globalThis.__cashUpPrismaClient = undefined;
    jest.resetModules();
    jest.doMock('../../persistence', () => ({
      createPrismaClient: jest.fn(() => ({})),
      UnitOfWork: class UnitOfWork {},
    }));
    jest.doMock('../../services/container', () => ({
      createServices: jest.fn(() => ({
        actorResolver: {},
        lifecycle: {},
        queries: {},
      })),
    }));
  });

  afterEach(() => {
    globalThis.__cashUpHttpDependencies = undefined;
    globalThis.__cashUpPrismaClient = undefined;
    jest.dontMock('../../persistence');
    jest.dontMock('../../services/container');
    jest.resetModules();
  });

  it('memoizes the dependency graph across module reloads', async () => {
    const firstModule = await import('../../server/composition');
    const first = firstModule.getHttpDeps();

    jest.resetModules();
    const reloadedModule = await import('../../server/composition');
    const afterReload = reloadedModule.getHttpDeps();

    expect(afterReload).toBe(first);
  });

  it('creates Prisma only when the dependency graph is requested', async () => {
    const createPrismaClient = jest.fn(() => ({}));
    jest.doMock('../../persistence', () => ({
      createPrismaClient,
      UnitOfWork: class UnitOfWork {},
    }));

    const composition = await import('../../server/composition');
    expect(createPrismaClient).not.toHaveBeenCalled();

    composition.getHttpDeps();

    expect(createPrismaClient).toHaveBeenCalledTimes(1);
  });

  it('disconnects once and rebuilds the dependency graph after closing', async () => {
    const firstClient = { $disconnect: jest.fn(async () => undefined) };
    const secondClient = { $disconnect: jest.fn(async () => undefined) };
    const createPrismaClient = jest.fn()
      .mockReturnValueOnce(firstClient)
      .mockReturnValueOnce(secondClient);
    jest.doMock('../../persistence', () => ({
      createPrismaClient,
      UnitOfWork: class UnitOfWork {},
    }));
    const composition = await import('../../server/composition');
    const first = composition.getHttpDeps();

    await composition.closeHttpDeps();
    await composition.closeHttpDeps();
    expect(firstClient.$disconnect).toHaveBeenCalledTimes(1);

    const rebuilt = composition.getHttpDeps();
    expect(rebuilt).not.toBe(first);
    expect(createPrismaClient).toHaveBeenCalledTimes(2);
    await composition.closeHttpDeps();
    expect(secondClient.$disconnect).toHaveBeenCalledTimes(1);
  });

  it('propagates disconnect failure and clears the cached dependencies', async () => {
    const failure = new Error('disconnect failed');
    const disconnect = jest.fn(async () => undefined).mockRejectedValueOnce(failure);
    const createPrismaClient = jest.fn(() => ({ $disconnect: disconnect }));
    jest.doMock('../../persistence', () => ({
      createPrismaClient,
      UnitOfWork: class UnitOfWork {},
    }));
    const composition = await import('../../server/composition');
    const first = composition.getHttpDeps();

    await expect(composition.closeHttpDeps()).rejects.toBe(failure);
    await expect(composition.closeHttpDeps()).resolves.toBeUndefined();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(composition.getHttpDeps()).not.toBe(first);
    expect(createPrismaClient).toHaveBeenCalledTimes(2);
    await composition.closeHttpDeps();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });
});
