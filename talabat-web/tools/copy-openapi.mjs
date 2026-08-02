import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = resolve(workspaceRoot, '..', '..', 'talabat');
const openApiDir = resolve(workspaceRoot, 'openapi');

const documents = [
  {
    source: resolve(backendRoot, 'src', 'Talabat', 'Talabat.API', 'openapi', 'customer-api.json'),
    target: resolve(openApiDir, 'customer-api.json'),
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
    target: resolve(openApiDir, 'delivery-api.json'),
  },
];

export function copyOpenApiDocument(source, target) {
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

export function copyOpenApiDocuments() {
  for (const document of documents) {
    copyOpenApiDocument(document.source, document.target);
  }
}

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  copyOpenApiDocuments();
}
