import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const openApiDir = resolve(workspaceRoot, 'openapi');

export function resolveBackendRoot() {
  const explicit = process.env.E2E_BACKEND_ROOT;
  if (explicit) {
    return resolve(explicit);
  }
  return resolve(workspaceRoot, '..', '..', 'talabat');
}

function documentsFor(backendRoot, targetOpenApiDir) {
  return [
    {
      source: resolve(backendRoot, 'src', 'Talabat', 'Talabat.API', 'openapi', 'customer-api.json'),
      target: resolve(targetOpenApiDir, 'customer-api.json'),
    },
    {
      source: resolve(
        backendRoot,
        'src',
        'Talabat',
        'Talabat.Delivery.API',
        'openapi',
        'delivery-api.json',
      ),
      target: resolve(targetOpenApiDir, 'delivery-api.json'),
    },
  ];
}

export function copyOpenApiDocument(source, target) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

export function copyOpenApiDocuments(
  backendRoot = resolveBackendRoot(),
  targetOpenApiDir = openApiDir,
) {
  for (const document of documentsFor(backendRoot, targetOpenApiDir)) {
    copyOpenApiDocument(document.source, document.target);
  }
}

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const explicitRoot = process.argv[2];
  copyOpenApiDocuments(explicitRoot ? resolve(explicitRoot) : undefined);
}
