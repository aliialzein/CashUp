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
});
