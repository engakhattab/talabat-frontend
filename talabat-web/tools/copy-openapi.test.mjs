import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { copyOpenApiDocument } from './copy-openapi.mjs';

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
