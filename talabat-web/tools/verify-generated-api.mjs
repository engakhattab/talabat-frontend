import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = resolve(workspaceRoot, 'projects', 'api-customer', 'src');
const contract = JSON.parse(
  readFileSync(resolve(workspaceRoot, 'openapi', 'customer-api.json'), 'utf8'),
);
const config = JSON.parse(
  readFileSync(resolve(workspaceRoot, 'openapi', 'customer.config.json'), 'utf8'),
);

const requiredSettings = {
  serviceSuffix: 'ApiService',
  stringEnums: true,
  providedInRoot: true,
  providedIn: 'root',
  useSingleRequestParameter: true,
  withInterfaces: false,
  supportsES6: true,
  fileNaming: 'kebab-case',
  enumPropertyNaming: 'PascalCase',
  npmName: '@talabat/api-customer',
};

function kebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function resolveLocalReference(reference) {
  if (!reference.startsWith('#/')) {
    return undefined;
  }

  return reference
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, part) => value?.[part], contract);
}

function collectSchemaReferences(node, references, visitedComponentReferences = new Set()) {
  if (Array.isArray(node)) {
    for (const child of node) {
      collectSchemaReferences(child, references, visitedComponentReferences);
    }
    return;
  }
  if (!node || typeof node !== 'object') {
    return;
  }

  const reference = node.$ref;
  if (typeof reference === 'string') {
    const schemaPrefix = '#/components/schemas/';
    if (reference.startsWith(schemaPrefix)) {
      references.add(
        reference.slice(schemaPrefix.length).replaceAll('~1', '/').replaceAll('~0', '~'),
      );
      return;
    }
    if (reference.startsWith('#/') && !visitedComponentReferences.has(reference)) {
      visitedComponentReferences.add(reference);
      collectSchemaReferences(
        resolveLocalReference(reference),
        references,
        visitedComponentReferences,
      );
    }
  }

  for (const [name, child] of Object.entries(node)) {
    if (name !== '$ref') {
      collectSchemaReferences(child, references, visitedComponentReferences);
    }
  }
}

function transitiveSchemas(directSchemas, schemaDependencies) {
  const result = new Set();
  const pending = [...directSchemas];
  while (pending.length > 0) {
    const schemaName = pending.shift();
    if (!result.has(schemaName)) {
      result.add(schemaName);
      pending.push(...(schemaDependencies.get(schemaName) ?? []));
    }
  }
  return result;
}

function assertRelativeImportsResolve(file) {
  const content = readFileSync(file, 'utf8');
  const importPattern = /(?:from\s+|export\s+\*\s+from\s+)['"](\.[^'"]+)['"]/g;
  for (const match of content.matchAll(importPattern)) {
    const target = resolve(dirname(file), match[1]);
    assert(
      existsSync(`${target}.ts`) || existsSync(join(target, 'index.ts')),
      `${relative(workspaceRoot, file)} has unresolved import ${match[1]}`,
    );
  }
}

assert.equal(config.generatorName, 'talabat-typescript-angular');
for (const [name, value] of Object.entries(requiredSettings)) {
  assert.deepEqual(config.additionalProperties[name], value, `Generator setting ${name} changed`);
}

const tags = contract.tags.map(({ name }) => name);
assert.deepEqual([...tags].sort(), [
  'Addresses',
  'Cart',
  'Catalog',
  'Checkout',
  'Customer',
  'Orders',
]);

const apiBarrel = readFileSync(join(sourceRoot, 'api', 'api.ts'), 'utf8');
for (const tag of tags) {
  const feature = kebabCase(tag);
  const serviceFile = `${feature}-api.service`;
  const servicePath = join(sourceRoot, 'api', feature, `${serviceFile}.ts`);
  assert(existsSync(servicePath), `Missing service ${relative(workspaceRoot, servicePath)}`);
  assert(
    apiBarrel.includes(`'./${feature}/${serviceFile}'`),
    `api.ts does not export ${serviceFile}`,
  );
  assert(
    !readFileSync(servicePath, 'utf8').includes(': any'),
    `${serviceFile}.ts contains ': any'`,
  );
}

const modelRoot = join(sourceRoot, 'model');
const modelBarrel = readFileSync(join(modelRoot, 'models.ts'), 'utf8');
const schemas = contract.components.schemas;
const schemaDependencies = new Map();
const tagsBySchema = new Map(Object.keys(schemas).map((schemaName) => [schemaName, new Set()]));
for (const [schemaName, schema] of Object.entries(schemas)) {
  const dependencies = new Set();
  collectSchemaReferences(schema, dependencies);
  schemaDependencies.set(schemaName, dependencies);
}

const httpMethods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
for (const pathItem of Object.values(contract.paths)) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!httpMethods.has(method) || !operation || typeof operation !== 'object') {
      continue;
    }
    const directSchemas = new Set();
    collectSchemaReferences(operation, directSchemas);
    collectSchemaReferences(pathItem.parameters, directSchemas);
    for (const schemaName of transitiveSchemas(directSchemas, schemaDependencies)) {
      if (tagsBySchema.has(schemaName)) {
        for (const tag of operation.tags ?? []) {
          tagsBySchema.get(schemaName).add(tag);
        }
      }
    }
  }
}

const expectedDomainBySchema = new Map();
for (const [schemaName, referencingTags] of tagsBySchema) {
  assert(referencingTags.size > 0, `${schemaName} is not referenced by a tagged operation`);
  expectedDomainBySchema.set(
    schemaName,
    referencingTags.size === 1 ? kebabCase([...referencingTags][0]) : 'shared',
  );
}

const approvedDomainCounts = {
  addresses: 2,
  cart: 4,
  catalog: 4,
  checkout: 4,
  customer: 2,
  orders: 5,
  shared: 4,
};
const actualDomainCounts = Object.fromEntries(
  Object.keys(approvedDomainCounts).map((domain) => [
    domain,
    [...expectedDomainBySchema.values()].filter((value) => value === domain).length,
  ]),
);
assert.deepEqual(actualDomainCounts, approvedDomainCounts, 'Model domain counts changed');
assert.deepEqual(
  [...expectedDomainBySchema]
    .filter(([, domain]) => domain === 'shared')
    .map(([schemaName]) => schemaName)
    .sort(),
  ['AddressDto', 'MoneyDto', 'ProblemDetails', 'ProfileResponse'],
  'Approved shared model mapping changed',
);

const modelEntries = readdirSync(modelRoot, { withFileTypes: true });
const generatedModelDomains = modelEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
assert.deepEqual(
  generatedModelDomains,
  Object.keys(approvedDomainCounts).sort(),
  'Generated model domains do not match the approved mapping',
);
for (const entry of modelEntries) {
  if (!entry.isDirectory()) {
    assert.equal(entry.name, 'models.ts', `Unexpected flat model file ${entry.name}`);
    continue;
  }
  const domainPath = join(modelRoot, entry.name);
  const domainEntries = readdirSync(domainPath, { withFileTypes: true });
  assert(
    domainEntries.every((domainEntry) => domainEntry.isFile()),
    `Model domain ${entry.name} contains a per-model directory`,
  );
}

const generatedModelPaths = [];
for (const [schemaName, domain] of expectedDomainBySchema) {
  const modelFile = kebabCase(schemaName);
  const modelPath = join(modelRoot, domain, `${modelFile}.ts`);
  assert(existsSync(modelPath), `Missing model ${relative(workspaceRoot, modelPath)}`);
  generatedModelPaths.push(modelPath);
  assert(
    modelBarrel.includes(`'./${domain}/${modelFile}'`),
    `models.ts does not export ${domain}/${modelFile}`,
  );
}
assert.equal(
  new Set(generatedModelPaths).size,
  Object.keys(schemas).length,
  'A schema was duplicated across model domains',
);

const noContentOperations = [];
for (const pathItem of Object.values(contract.paths)) {
  for (const operation of Object.values(pathItem)) {
    if (
      operation &&
      typeof operation === 'object' &&
      operation.operationId &&
      operation.responses?.['204']
    ) {
      noContentOperations.push(operation);
    }
  }
}
assert(noContentOperations.length > 0, 'Fixture contract has no 204 operations');
for (const operation of noContentOperations) {
  const tag = kebabCase(operation.tags[0]);
  const method = operation.operationId[0].toLowerCase() + operation.operationId.slice(1);
  const service = readFileSync(join(sourceRoot, 'api', tag, `${tag}-api.service.ts`), 'utf8');
  assert(
    new RegExp(`public\\s+${method}\\([^;]+\\): Observable<void>;`).test(service),
    `${operation.operationId} is not generated as Observable<void>`,
  );
}

const typescriptFiles = walk(sourceRoot).filter((file) => extname(file) === '.ts');
for (const file of typescriptFiles) {
  assertRelativeImportsResolve(file);
}

const index = readFileSync(join(sourceRoot, 'index.ts'), 'utf8');
assert(index.includes("export * from './api/api';"));
assert(index.includes("export * from './model/models';"));

console.log(
  `Verified ${tags.length} API services, ${generatedModelPaths.length} models across ${generatedModelDomains.length} domains, and ${typescriptFiles.length} TypeScript files.`,
);
