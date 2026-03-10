import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const BASE_URL =
  process.env.E2E_BASE_URL || "http://localhost:8080";

export const DEV_TENANT_ID = "a0000000-0000-0000-0000-000000000001";
export const SECOND_TENANT_ID = "b0000000-0000-0000-0000-000000000002";

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export interface TokenResponse {
  accessToken: string;
  tenantId: string;
  userId: string;
  email: string;
  expiresIn: string;
}

/** POST /v1/auth/dev-token → get a valid JWT (dev profile only) */
export async function getDevToken(): Promise<TokenResponse> {
  const resp = await fetch(`${BASE_URL}/v1/auth/dev-token`, {
    method: "POST",
  });
  if (!resp.ok) throw new Error(`dev-token failed: ${resp.status}`);
  return resp.json() as Promise<TokenResponse>;
}

/** Build common auth + tenant headers */
export function authHeaders(
  token: string,
  tenantId: string = DEV_TENANT_ID
): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "X-Tenant-ID": tenantId,
  };
}

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

/** Read a test PDF from test-data/ directory */
export function readTestPdf(filename = "test-invoice.pdf"): Buffer {
  const pdfPath = resolve(__dirname, "../../../test-data", filename);
  return readFileSync(pdfPath);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Delete CREATED / PROCESSING jobs for the given tenant.
 * Uses docker exec psql. Silently ignores failures.
 */
export function cleanupTestData(
  _token: string,
  _tenantId: string = DEV_TENANT_ID
): void {
  try {
    const container = process.env.DB_CONTAINER || "saas-db";
    const dbName = process.env.DB_NAME || "ai_saas_db";
    const dbUser = process.env.DB_USER || "saas_admin";
    execSync(
      `docker exec ${container} psql -U ${dbUser} -d ${dbName} -c "` +
        `SELECT set_config('app.current_tenant_id', '${_tenantId}', true); ` +
        `DELETE FROM ai_jobs WHERE status IN ('CREATED','PROCESSING') ` +
        `AND tenant_id = '${_tenantId}';"`,
      { stdio: "ignore", timeout: 5_000 }
    );
  } catch {
    // Non-fatal — DB may not be reachable in certain CI setups
  }
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

export interface ScanJobResult {
  jobId: string;
  status: "CREATED" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  s3Key: string;
  items?: unknown[];
}

/**
 * Poll GET /scan/{jobId} every `intervalMs` until status is COMPLETED
 * or `timeoutMs` is exceeded. Returns the final response.
 */
export async function pollUntilComplete(
  jobId: string,
  token: string,
  tenantId: string = DEV_TENANT_ID,
  timeoutMs = 30_000,
  intervalMs = 2_000
): Promise<ScanJobResult> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const resp = await fetch(
      `${BASE_URL}/v1/customsguard/scan/${jobId}`,
      { headers: authHeaders(token, tenantId) }
    );
    if (!resp.ok) throw new Error(`poll failed: ${resp.status}`);

    const data = (await resp.json()) as ScanJobResult;
    if (data.status === "COMPLETED" || data.status === "FAILED") return data;

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out waiting for job ${jobId} to complete`);
}
