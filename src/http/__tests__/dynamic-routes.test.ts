import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const apiDirectory = path.resolve(process.cwd(), 'src', 'app', 'api');
const helperPath = path.resolve(process.cwd(), 'src', 'server', 'dynamic-route.ts');

function findRouteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findRouteFiles(entryPath);
    return entry.name === 'route.ts' ? [entryPath] : [];
  });
}

function callName(expression: ts.Expression): string | undefined {
  return ts.isCallExpression(expression) && ts.isIdentifier(expression.expression)
    ? expression.expression.text
    : undefined;
}

describe('dynamic API route architecture', () => {
  it('awaits connection through the shared helper before every route handler runs', () => {
    const helperSource = ts.createSourceFile(
      helperPath,
      readFileSync(helperPath, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const helper = helperSource.statements.find(
      (statement): statement is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(statement) && statement.name?.text === 'runDynamicRoute',
    );
    expect(helper?.body?.statements.map((statement) =>
      ts.isExpressionStatement(statement) && ts.isAwaitExpression(statement.expression)
        ? callName(statement.expression.expression)
        : ts.isReturnStatement(statement)
          ? callName(statement.expression!)
          : undefined,
    )).toEqual(['connection', 'handler']);

    const routeFiles = findRouteFiles(apiDirectory);
    expect(routeFiles.length).toBeGreaterThan(0);

    for (const routePath of routeFiles) {
      const source = readFileSync(routePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        routePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const helperImported = sourceFile.statements.some(
        (statement) =>
          ts.isImportDeclaration(statement) &&
          statement.moduleSpecifier.getText(sourceFile) === "'@/server/dynamic-route'" &&
          statement.importClause?.namedBindings !== undefined &&
          ts.isNamedImports(statement.importClause.namedBindings) &&
          statement.importClause.namedBindings.elements.some(
            (element) => element.name.text === 'runDynamicRoute',
          ),
      );
      expect(helperImported).toBe(true);

      const handlers = sourceFile.statements.filter(
        (statement): statement is ts.FunctionDeclaration =>
          ts.isFunctionDeclaration(statement) &&
          statement.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
          ) === true,
      );
      expect(handlers.length).toBeGreaterThan(0);
      for (const handler of handlers) {
        expect(handler.body?.statements[0]).toBeDefined();
        const firstStatement = handler.body?.statements[0];
        expect(
          firstStatement && ts.isReturnStatement(firstStatement)
            ? callName(firstStatement.expression!)
            : undefined,
        ).toBe('runDynamicRoute');
      }
    }
  });
});
