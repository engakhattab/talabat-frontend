import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import { copyOpenApiDocument, copyOpenApiDocuments, resolveBackendRoot } from './copy-openapi.mjs';

test('copies an OpenAPI document unchanged and creates its target directory', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'talabat-openapi-tools-'));
  const source = join(directory, 'source.json');
  const target = join(directory, 'nested', 'customer-api.json');
  const fixture = `${JSON.stringify({ openapi: '3.0.4', components: { schemas: { Total: { type: 'number', format: 'double' } } } }, null, 2)}\n`;

  try {
    await writeFile(source, fixture);
    copyOpenApiDocument(source, target);
    assert.equal(await readFile(target, 'utf8'), fixture);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('copies both committed documents from an explicit backend root to a target directory', async () => {
  const backendRoot = await mkdtemp(join(tmpdir(), 'talabat-backend-root-'));
  const openApiDir = join(backendRoot, 'openapi-output');
  const fixture = `${JSON.stringify({ openapi: '3.0.4', info: { title: 'fixture' } }, null, 2)}\n`;

  try {
    const customerSource = join(
      backendRoot,
      'src',
      'Talabat',
      'Talabat.API',
      'openapi',
      'customer-api.json',
    );
    const deliverySource = join(
      backendRoot,
      'src',
      'Talabat',
      'Talabat.Delivery.API',
      'openapi',
      'delivery-api.json',
    );
    await mkdir(dirname(customerSource), { recursive: true });
    await mkdir(dirname(deliverySource), { recursive: true });
    await writeFile(customerSource, fixture);
    await writeFile(deliverySource, fixture);

    const previousRoot = process.env.E2E_BACKEND_ROOT;
    try {
      process.env.E2E_BACKEND_ROOT = backendRoot;
      copyOpenApiDocuments(resolveBackendRoot(), openApiDir);
      assert.equal(await readFile(join(openApiDir, 'customer-api.json'), 'utf8'), fixture);
      assert.equal(await readFile(join(openApiDir, 'delivery-api.json'), 'utf8'), fixture);
    } finally {
      if (previousRoot === undefined) {
        delete process.env.E2E_BACKEND_ROOT;
      } else {
        process.env.E2E_BACKEND_ROOT = previousRoot;
      }
    }
  } finally {
    await rm(backendRoot, { recursive: true, force: true });
  }
});
