import Constants from "expo-constants";
import type {
  BudgetProgressDto,
  CategoryDto,
  CopyBudgetsInput,
  CreateCategoryInput,
  CreateTransactionInput,
  DashboardSummaryDto,
  GmailStatusDto,
  GmailSyncStatus,
  TransactionDetailDto,
  TransactionDto,
  TransactionListQuery,
  TransactionListResponse,
  UpdateTransactionInput,
  UpsertBudgetInput,
} from "@budgetmail/shared-types";

// On a phone or Android emulator, "localhost" is the device itself. Point
// EXPO_PUBLIC_API_BASE_URL or expo.extra.apiBaseUrl at your machine's LAN IP
// (10.0.2.2 on the Android emulator).
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// The server couldn't be reached at all
export class NetworkError extends Error {}

let onUnauthorized: (() => void) | null = null;

// AuthProvider plugs signOut in here, so a 401 anywhere sends the user back to login.
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const { method = "GET", body, token } = options;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        // Fastify rejects a bodiless request (e.g. DELETE) that declares a JSON body.
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new NetworkError("Tidak bisa terhubung ke server. Cek koneksi internetmu.");
  }

  if (response.status === 401 && token) {
    onUnauthorized?.();
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, payload?.error ?? "Terjadi kesalahan. Coba lagi.");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== "",
  );
  if (entries.length === 0) return "";
  return `?${entries.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`).join("&")}`;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.";
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

export function loginWithGoogle(idToken: string) {
  return request<AuthResponse>("/auth/google", { method: "POST", body: { idToken } });
}

export function getMe(token: string) {
  return request<{ id: string; email: string; name: string; createdAt: string }>("/auth/me", {
    token,
  });
}

export type GmailStatus = GmailSyncStatus;

export function connectGmail(token: string) {
  return request<{ url: string }>("/gmail/connect", { method: "POST", token });
}

export function getGmailStatus(token: string) {
  return request<GmailStatusDto>("/gmail/status", { token });
}

export function triggerGmailSync(token: string) {
  return request<{ status: "sync_queued" }>("/gmail/sync", { method: "POST", token });
}

export function disconnectGmail(token: string) {
  return request<{ status: GmailStatus }>("/gmail/disconnect", { method: "DELETE", token });
}

export function listCategories(token: string) {
  return request<{ items: CategoryDto[] }>("/categories", { token });
}

export function createCategory(token: string, input: CreateCategoryInput) {
  return request<CategoryDto>("/categories", { method: "POST", body: input, token });
}

export function listTransactions(token: string, query: TransactionListQuery) {
  return request<TransactionListResponse>(`/transactions${toQueryString({ ...query })}`, {
    token,
  });
}

export function getTransaction(token: string, id: string) {
  return request<TransactionDetailDto>(`/transactions/${encodeURIComponent(id)}`, { token });
}

export function createTransaction(token: string, input: CreateTransactionInput) {
  return request<TransactionDto>("/transactions", { method: "POST", body: input, token });
}

export function updateTransaction(token: string, id: string, input: UpdateTransactionInput) {
  return request<TransactionDetailDto>(`/transactions/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
    token,
  });
}

export function deleteTransaction(token: string, id: string) {
  return request<void>(`/transactions/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

export function listBudgets(token: string, month: string) {
  return request<{ items: BudgetProgressDto[] }>(`/budgets${toQueryString({ month })}`, { token });
}

export function upsertBudget(token: string, input: UpsertBudgetInput) {
  return request<BudgetProgressDto>("/budgets", { method: "POST", body: input, token });
}

export function copyBudgets(token: string, input: CopyBudgetsInput) {
  return request<{ created: number }>("/budgets/copy", { method: "POST", body: input, token });
}

export function deleteBudget(token: string, id: string) {
  return request<void>(`/budgets/${encodeURIComponent(id)}`, { method: "DELETE", token });
}

export function getDashboardSummary(token: string, month: string) {
  return request<DashboardSummaryDto>(`/dashboard/summary${toQueryString({ month })}`, { token });
}
