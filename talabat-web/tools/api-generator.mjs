import { existsSync, lstatSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generatorRoot = resolve(workspaceRoot, 'tools', 'talabat-openapi-generator');
export const generatorJar = resolve(generatorRoot, 'target', 'talabat-openapi-generator-1.0.0.jar');
export const generatedSource = resolve(workspaceRoot, 'projects', 'api-customer', 'src');
export const generatorConfig = resolve(workspaceRoot, 'openapi', 'customer.config.json');
export const generatorTemplates = resolve(workspaceRoot, 'openapi', 'templates', 'typescript-angular');
export const cliEntry = resolve(
  workspaceRoot,
  'node_modules',
  '@openapitools',
  'openapi-generator-cli',
  'main.js',
);

function run(command, args, cwd = workspaceRoot) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: false });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}`);
  }
}

export function buildGenerator() {
  const wrapper = resolve(generatorRoot, process.platform === 'win32' ? 'mvnw.cmd' : 'mvnw');
  if (!existsSync(wrapper)) {
    throw new Error(`Maven Wrapper is missing: ${wrapper}`);
  }
  const arguments_ = ['--no-transfer-progress', 'clean', 'verify'];
  if (process.platform === 'win32') {
    run(
      process.env.ComSpec ?? 'cmd.exe',
      ['/d', '/s', '/c', wrapper, ...arguments_],
      generatorRoot,
    );
  } else {
    run('sh', [wrapper, ...arguments_], generatorRoot);
  }
}

function assertSafeGeneratedSource() {
  const expected = resolve(workspaceRoot, 'projects', 'api-customer', 'src');
  if (
    generatedSource !== expected ||
    dirname(generatedSource) !== resolve(workspaceRoot, 'projects', 'api-customer')
  ) {
    throw new Error(`Refusing to clean unexpected path: ${generatedSource}`);
  }
  if (existsSync(generatedSource) && lstatSync(generatedSource).isSymbolicLink()) {
    throw new Error(`Refusing to clean symbolic link: ${generatedSource}`);
  }
}

export function cleanGeneratedSource() {
  assertSafeGeneratedSource();
  rmSync(generatedSource, { recursive: true, force: true });
}

function generateTo(outputDirectory, options = {}) {
  if (!existsSync(generatorJar)) {
    buildGenerator();
  }
  if (!existsSync(cliEntry)) {
    throw new Error('OpenAPI Generator CLI is not installed. Run npm install first.');
  }
  run(process.execPath, [
    cliEntry,
    `--custom-generator=${generatorJar}`,
    'generate',
    '-c',
    generatorConfig,
    '-o',
    outputDirectory,
    '-t',
    generatorTemplates,
  ]);
}

export function generateCustomer(outputDirectory = generatedSource) {
  if (outputDirectory === generatedSource) {
    cleanGeneratedSource();
  }
  generateTo(outputDirectory);
}

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const command = process.argv[2];
  switch (command) {
    case 'build':
      buildGenerator();
      break;
    case 'clean':
      cleanGeneratedSource();
      break;
    case 'generate-customer':
      generateCustomer();
      break;
    default:
      throw new Error('Usage: node tools/api-generator.mjs <build|clean|generate-customer>');
  }
}
