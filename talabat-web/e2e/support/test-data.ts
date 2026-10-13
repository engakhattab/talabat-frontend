import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';

export const E2E_SPA_URL = 'http://localhost:4200';
export const E2E_IDENTITY_ORIGIN = 'https://localhost:7237';
export const E2E_CUSTOMER_API_ORIGIN = 'https://localhost:7056';
export const E2E_CUSTOMER_API_HEALTH = `${E2E_CUSTOMER_API_ORIGIN}/health`;
export const E2E_IDENTITY_DISCOVERY = `${E2E_IDENTITY_ORIGIN}/.well-known/openid-configuration`;

export interface AddressFixture {
  id: number;
  label: string;
}

export interface CatalogFixture {
  restaurant: { id: number; name: string };
  happyProduct: { id: number; name: string; available: boolean };
  negativeProduct: { id: number; name: string; available: boolean };
}

export interface ProvisionMetadata {
  version: number;
  operation: string;
  environment: string;
  customer: { email: string; displayName: string };
  addresses: { default: AddressFixture; alternate: AddressFixture };
  catalog: CatalogFixture;
}

export type ProvisionOperation = 'prepare' | 'make-negative-product-unavailable' | 'restore';

export class BlockedPreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BlockedPreflightError';
  }
}

const DEFAULT_BACKEND_ROOT = resolve(process.cwd(), '..', '..', 'talabat');

export function resolveBackendRoot(): string {
  return process.env.E2E_BACKEND_ROOT ?? DEFAULT_BACKEND_ROOT;
}

export function provisionerProjectPath(backendRoot = resolveBackendRoot()): string {
  return resolve(
    backendRoot,
    'src',
    'Talabat',
    'Talabat.Identity',
    'Talabat.Identity.csproj',
  );
}

const CONTRACT_MARKER = '--e2e-provision';

export interface ProvisionerContract {
  readonly backendRoot: string;
  readonly projectPath: string;
  readonly version: number;
  readonly operations: readonly ProvisionOperation[];
}

export function resolveProvisionerContract(backendRoot = resolveBackendRoot()): ProvisionerContract {
  const projectPath = provisionerProjectPath(backendRoot);
  const projectDirectory = dirname(projectPath);
  if (!existsSync(projectPath) || !existsSync(projectDirectory)) {
    throw new BlockedPreflightError(
      'blocked-preflight: backend-owned E2E provisioner host is not present in the configured backend root',
    );
  }
  const contractDeclared = readdirSync(projectDirectory)
    .filter((name) => name.endsWith('.cs'))
    .some((name) => readFileSync(resolve(projectDirectory, name), 'utf8').includes(CONTRACT_MARKER));
  if (!contractDeclared) {
    throw new BlockedPreflightError(
      `blocked-preflight: backend provisioner contract is unversioned/missing (no '${CONTRACT_MARKER}' handoff declared)`,
    );
  }
  return {
    backendRoot,
    projectPath,
    version: 1,
    operations: ['prepare', 'make-negative-product-unavailable', 'restore'],
  };
}

export function assertRequiredCredentials(email?: string, password?: string): void {
  if (!email || !password) {
    throw new BlockedPreflightError(
      'blocked-preflight: E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD must be set; values are never printed',
    );
  }
}

export async function runProvisioner(
  operation: ProvisionOperation,
  options: { backendRoot?: string; email: string; password: string } = {
    email: process.env.E2E_CUSTOMER_EMAIL ?? '',
    password: process.env.E2E_CUSTOMER_PASSWORD ?? '',
  },
): Promise<ProvisionMetadata> {
  const contract = resolveProvisionerContract(options.backendRoot);
  if (!contract.operations.includes(operation)) {
    throw new BlockedPreflightError(
      `blocked-preflight: backend provisioner does not declare operation '${operation}'`,
    );
  }
  if (!options.email || !options.password) {
    throw new BlockedPreflightError(
      'blocked-preflight: E2E_CUSTOMER_EMAIL and E2E_CUSTOMER_PASSWORD must be set; values are never printed',
    );
  }

  const { stdout, stderr, exitCode } = await runProvisionerProcess(
    contract.projectPath,
    operation,
    options.email,
    options.password,
  );

  if (exitCode !== 0) {
    throw new BlockedPreflightError(
      `blocked-preflight: backend provisioner '${operation}' exited ${exitCode}; run details are recorded without secrets`,
    );
  }

  const metadata = parseProvisionMetadata(stdout);
  if (metadata.version !== contract.version) {
    throw new BlockedPreflightError(
      `blocked-preflight: backend provisioner version ${metadata.version} does not match declared contract version ${contract.version}`,
    );
  }
  return metadata;
}

async function runProvisionerProcess(
  projectPath: string,
  operation: ProvisionOperation,
  email: string,
  password: string,
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  const child = spawn(
    'dotnet',
    [
      'run',
      '--project',
      projectPath,
      '--no-launch-profile',
      '--',
      '--e2e-provision',
      operation,
      '--output',
      'json',
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        E2E_CUSTOMER_EMAIL: email,
        E2E_CUSTOMER_PASSWORD: password,
        E2E__Provisioning__Enabled: 'true',
        ASPNETCORE_ENVIRONMENT: 'Development',
      },
    },
  );

  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

  const exitCode = await new Promise<number | null>((resolveExit) => {
    child.on('close', resolveExit);
  });

  return {
    stdout: Buffer.concat(stdoutChunks).toString('utf8'),
    stderr: Buffer.concat(stderrChunks).toString('utf8'),
    exitCode,
  };
}

function parseProvisionMetadata(stdout: string): ProvisionMetadata {
  const lastJsonLine = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse()
    .find((line) => line.startsWith('{') && line.endsWith('}'));
  if (!lastJsonLine) {
    throw new BlockedPreflightError(
      'blocked-preflight: backend provisioner produced no versioned JSON metadata on stdout',
    );
  }
  try {
    return JSON.parse(lastJsonLine) as ProvisionMetadata;
  } catch {
    throw new BlockedPreflightError(
      'blocked-preflight: backend provisioner metadata was not valid JSON',
    );
  }
}

export interface PublicSpaConfig {
  identityAuthority: string;
  customerApiBaseUrl: string;
  clientId: string;
  scopes: string;
}

export function assertPublicSpaConfig(config: PublicSpaConfig): void {
  if (config.identityAuthority !== E2E_IDENTITY_ORIGIN) {
    throw new BlockedPreflightError(
      `blocked-preflight: SPA identityAuthority ${config.identityAuthority} does not match the fixed loopback topology`,
    );
  }
  if (config.customerApiBaseUrl !== E2E_CUSTOMER_API_ORIGIN) {
    throw new BlockedPreflightError(
      `blocked-preflight: SPA customerApiBaseUrl ${config.customerApiBaseUrl} does not match the fixed loopback topology`,
    );
  }
  if (!config.clientId || !config.scopes) {
    throw new BlockedPreflightError('blocked-preflight: SPA clientId/scopes must be non-empty');
  }
}
