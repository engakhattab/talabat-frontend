import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const customerDistRoot = resolve(workspaceRoot, 'dist', 'customer');
const featurePattern = /^projects\/customer\/src\/app\/features\//;

function findStatsJson() {
  const candidates = [
    join(customerDistRoot, 'browser', 'stats.json'),
    join(customerDistRoot, 'stats.json'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error(
    `stats.json not found under ${customerDistRoot}. Run a production build with --stats-json first.`,
  );
}

function summarizeBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

const statsPath = findStatsJson();
const stats = JSON.parse(readFileSync(statsPath, 'utf8'));

const outputs = stats.outputs ?? {};
const outputEntries = Object.entries(outputs).filter(([, output]) => typeof output.bytes === 'number');
const mainEntry = outputEntries.find(([, output]) =>
  (output.entryPoint ?? '').endsWith('/src/main.ts'),
);
const stylesEntry = outputEntries.find(([, output]) =>
  (output.entryPoint ?? '').startsWith('angular:styles'),
);

if (!mainEntry) {
  throw new Error('No main bundle output found in stats.json');
}

const [mainName, mainOutput] = mainEntry;
const mainBytes = mainOutput.bytes;
const stylesBytes = stylesEntry ? stylesEntry[1].bytes : 0;
const initialBytes = mainBytes + stylesBytes;

const mainInputs = mainOutput.inputs ?? {};
const inputBytes = stats.inputs ?? {};
const mainInputEntries = Object.entries(mainInputs)
  .map(([path]) => ({
    path,
    bytes: inputBytes[path]?.bytes ?? mainInputs[path]?.bytes ?? 0,
  }))
  .sort((a, b) => b.bytes - a.bytes);

const featureInputsInMain = mainInputEntries
  .map(({ path }) => path.replaceAll('\\', '/'))
  .filter((path) => featurePattern.test(path));

console.log(`Stats: ${statsPath}`);
console.log(`Initial total: ${summarizeBytes(initialBytes)} (main ${summarizeBytes(mainBytes)} + styles ${summarizeBytes(stylesBytes)})`);
console.log(`Largest main inputs:`);
for (const { path, bytes } of mainInputEntries.slice(0, 10)) {
  console.log(`  ${summarizeBytes(bytes)}  ${path}`);
}

if (featureInputsInMain.length > 0) {
  console.error(
    `Bundle audit FAILED: customer feature source found in the main bundle:\n${featureInputsInMain.join('\n')}`,
  );
  process.exit(1);
}

console.log(
  `Bundle audit PASS: no projects/customer/src/app/features/** source is included in the main bundle.`,
);
