import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import type {
  CopyBudgetsInput,
  CreateCategoryInput,
  CreateTransactionInput,
  TransactionStatus,
  TransactionType,
  UpdateTransactionInput,
  UpsertBudgetInput,
} from "@budgetmail/shared-types";

import * as api from "@/api/client";
import { useAuth } from "@/hooks/use-auth";

export const queryKeys = {
  me: ["me"] as const,
  gmailStatus: ["gmail-status"] as const,
  categories: ["categories"] as const,
  transactions: ["transactions"] as const,
  transactionList: (month: string, filter: TransactionFilter) =>
    ["transactions", "list", month, filter] as const,
  transaction: (id: string) => ["transactions", "detail", id] as const,
  budgets: (month: string) => ["budgets", month] as const,
  dashboard: (month: string) => ["dashboard", month] as const,
};

export interface TransactionFilter {
  status?: TransactionStatus;
  type?: TransactionType;
}

// Lists, totals and budget progress all depend on transactions.
export function invalidateMoneyData(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  ]);
}

function useToken() {
  const { token } = useAuth();
  return token;
}

export function useMe() {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.getMe(token!),
    enabled: !!token,
    staleTime: 5 * 60_000,
  });
}

export function useCategories() {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => (await api.listCategories(token!)).items,
    enabled: !!token,
    staleTime: 10 * 60_000,
  });
}

export function useTransactions(month: string, filter: TransactionFilter) {
  const token = useToken();
  return useInfiniteQuery({
    queryKey: queryKeys.transactionList(month, filter),
    queryFn: ({ pageParam }) =>
      api.listTransactions(token!, { month, ...filter, cursor: pageParam, limit: 40 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!token,
  });
}

export function useTransaction(id: string | undefined) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.transaction(id ?? ""),
    queryFn: () => api.getTransaction(token!, id!),
    enabled: !!token && !!id,
  });
}

export function useBudgets(month: string) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.budgets(month),
    queryFn: async () => (await api.listBudgets(token!, month)).items,
    enabled: !!token,
  });
}

export function useDashboard(month: string) {
  const token = useToken();
  return useQuery({
    queryKey: queryKeys.dashboard(month),
    queryFn: () => api.getDashboardSummary(token!, month),
    enabled: !!token,
  });
}

export function useCreateTransaction() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => api.createTransaction(token!, input),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useUpdateTransaction(id: string) {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTransactionInput) => api.updateTransaction(token!, id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.transaction(id), updated);
      return invalidateMoneyData(queryClient);
    },
  });
}

export function useDeleteTransaction() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(token!, id),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useCreateCategory() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => api.createCategory(token!, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  });
}

export function useUpsertBudget() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertBudgetInput) => api.upsertBudget(token!, input),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useCopyBudgets() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CopyBudgetsInput) => api.copyBudgets(token!, input),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useDeleteBudget() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBudget(token!, id),
    onSuccess: () => invalidateMoneyData(queryClient),
  });
}

export function useDisconnectGmail() {
  const token = useToken();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.disconnectGmail(token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.gmailStatus }),
  });
}
