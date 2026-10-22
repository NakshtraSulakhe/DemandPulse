import { getCrmConfig } from "@/lib/crm-config";
import { getShiftBusinessDate } from "@/lib/shift/engine";
import {
  CrmApiResponse,
  IncentivePreviewData,
  DailySettledData,
  SettleResponseData,
  ApprovalActionResult,
  DisburseResult,
  PayoutStatusDetails,
  BeneficiaryData,
  SaveBeneficiaryPayload,
  IncentiveHistoryData,
  PayrollReconciliationData,
  SettlementMode,
  PaymentMethod,
} from "./types";

/**
 * Returns the base URL for the incentives API
 */
async function getIncentivesBaseUrl(): Promise<string> {
  if (process.env.CRM_INCENTIVES_API_URL) {
    return process.env.CRM_INCENTIVES_API_URL.replace(/\/+$/, "");
  }
  const config = await getCrmConfig();
  const crmBase = config.crmApiBaseUrl.replace(/\/+$/, "");
  return `${crmBase}/incentives`;
}

/**
 * Helper to call CRM Incentive endpoints with secure server-to-server token
 */
async function callIncentiveApi<T>(
  endpoint: string,
  options: RequestInit = {},
  queryParams?: Record<string, string | number | undefined>
): Promise<CrmApiResponse<T>> {
  const baseUrl = await getIncentivesBaseUrl();
  const config = await getCrmConfig();
  const token = config.crmApiToken || process.env.CRM_API_TOKEN || "df_admin_secret_token_2026";

  let urlStr = `${baseUrl}/${endpoint.replace(/^\/+/, "")}`;
  const url = new URL(urlStr);

  if (queryParams) {
    Object.entries(queryParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    });
  }

  // Include token in query string if not present
  if (token && !url.searchParams.has("token")) {
    url.searchParams.set("token", token);
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "X-API-Key": token,
    ...(options.headers as Record<string, string>),
  };

  try {
    const res = await fetch(url.toString(), {
      ...options,
      headers,
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        status: res.status,
        error: json?.error || json?.message || `CRM API error HTTP ${res.status}`,
        error_code: json?.error_code || "CRM_HTTP_ERROR",
        timestamp: new Date().toISOString(),
      };
    }

    if (!json) {
      return {
        success: false,
        status: 502,
        error: "Invalid JSON received from CRM incentives API",
        error_code: "INVALID_RESPONSE",
        timestamp: new Date().toISOString(),
      };
    }

    return json as CrmApiResponse<T>;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      status: 500,
      error: `Failed to connect to CRM Incentives API: ${errorMsg}`,
      error_code: "NETWORK_ERROR",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * 1. Preview Daily Incentives (Provisional / Read-Only)
 */
export async function fetchIncentivePreview(date?: string): Promise<CrmApiResponse<IncentivePreviewData>> {
  const targetDate = date || getShiftBusinessDate();
  return callIncentiveApi<IncentivePreviewData>("preview.php", { method: "GET" }, { date: targetDate });
}

/**
 * 2. Get Settled Daily Records
 */
export async function fetchDailySettled(params?: {
  date?: string;
  approval_status?: string;
  payment_status?: string;
  agent_id?: number;
  page?: number;
  limit?: number | string;
}): Promise<CrmApiResponse<DailySettledData>> {
  const targetDate = params?.date || getShiftBusinessDate();
  return callIncentiveApi<DailySettledData>(
    "daily.php",
    { method: "GET" },
    {
      date: targetDate,
      approval_status: params?.approval_status,
      payment_status: params?.payment_status,
      agent_id: params?.agent_id,
      page: params?.page,
      limit: params?.limit || 100,
    }
  );
}

/**
 * 3. Settle Daily Incentives (dry_run, finalize, recalculate_unpaid)
 */
export async function settleIncentives(payload: {
  work_date: string;
  mode: SettlementMode;
  manager_override?: boolean;
  override_reason?: string;
}): Promise<CrmApiResponse<SettleResponseData>> {
  return callIncentiveApi<SettleResponseData>("settle.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * 4. Manager Approval & Rejection
 */
export async function approveIncentives(payload: {
  payout_ids: number[];
  action: "approve" | "reject";
  remarks?: string;
}): Promise<CrmApiResponse<ApprovalActionResult>> {
  return callIncentiveApi<ApprovalActionResult>("approve.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * 5. Payout Disbursement (Bank / UPI)
 */
export async function disburseIncentive(payload: {
  payout_id: number;
  payment_method?: PaymentMethod;
}): Promise<CrmApiResponse<DisburseResult>> {
  return callIncentiveApi<DisburseResult>("disburse.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * 6. Payout Status & Audit Trail
 */
export async function fetchPayoutStatus(payout_id: number): Promise<CrmApiResponse<PayoutStatusDetails>> {
  return callIncentiveApi<PayoutStatusDetails>("status.php", { method: "GET" }, { payout_id });
}

/**
 * 7. Beneficiary Bank & UPI Management
 */
export async function fetchBeneficiary(agent_id: number): Promise<CrmApiResponse<BeneficiaryData>> {
  return callIncentiveApi<BeneficiaryData>("beneficiaries.php", { method: "GET" }, { agent_id });
}

export async function saveBeneficiary(payload: SaveBeneficiaryPayload): Promise<CrmApiResponse<BeneficiaryData>> {
  return callIncentiveApi<BeneficiaryData>("beneficiaries.php", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * 8. Historical Incentive Range
 */
export async function fetchIncentiveHistory(params: {
  from: string;
  to: string;
  agent_id?: number;
  approval_status?: string;
  payment_status?: string;
  page?: number;
  limit?: number | string;
}): Promise<CrmApiResponse<IncentiveHistoryData>> {
  return callIncentiveApi<IncentiveHistoryData>("history.php", { method: "GET" }, params);
}

/**
 * 9. Monthly Payroll Reconciliation Report (JSON)
 */
export async function fetchPayrollReport(
  month: string,
  exportType: "json" | "csv" = "json"
): Promise<CrmApiResponse<PayrollReconciliationData>> {
  return callIncentiveApi<PayrollReconciliationData>("report.php", { method: "GET" }, { month, export: exportType });
}

/**
 * Direct Raw CSV Stream for Monthly Payroll
 */
export async function fetchPayrollCsv(month: string): Promise<{ ok: boolean; csv?: string; error?: string }> {
  const baseUrl = await getIncentivesBaseUrl();
  const config = await getCrmConfig();
  const token = config.crmApiToken || process.env.CRM_API_TOKEN || "df_admin_secret_token_2026";

  const url = `${baseUrl}/report.php?month=${encodeURIComponent(month)}&export=csv&token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/csv, application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, error: `Failed to download CSV (HTTP ${res.status})` };
    }

    const csvText = await res.text();
    return { ok: true, csv: csvText };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
