import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import type { GmailStatusDto } from "@budgetmail/shared-types";

import * as api from "@/api/client";
import { invalidateMoneyData, queryKeys } from "@/api/queries";
import { useAuth } from "@/hooks/use-auth";
import * as storage from "@/lib/storage";

const ANNOUNCED_KEY = "budgetmail_announced_sync";
const FAST_POLL_MS = 3_000;
const IDLE_POLL_MS = 60_000;
// Keep polling fast for a while after a manual sync: parsing runs one job per email,
// so transactionsCreated keeps growing after the sync job itself completes.
const WATCH_AFTER_TRIGGER_MS = 45_000;

export interface InflowNotice {
  // The sync job id. The count can still grow while the toast is up.
  key: string;
  count: number;
}

interface SyncContextValue {
  gmail: GmailStatusDto | undefined;
  gmailLoading: boolean;
  isSyncing: boolean;
  startSync: () => Promise<void>;
  // Transactions created after this get the Inflow entrance
  inflowSince: number | null;
  notice: InflowNotice | null;
  dismissNotice: () => void;
  // So a row animates once, not every time it remounts while scrolling
  claimInflow: (transactionId: string) => boolean;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

interface Announced {
  id: string;
  count: number;
}

export function SyncProvider({ children }: PropsWithChildren) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [watchUntil, setWatchUntil] = useState(0);
  const [inflowSince, setInflowSince] = useState<number | null>(null);
  // undefined until loaded from storage
  const [announced, setAnnounced] = useState<Announced | null | undefined>(undefined);
  const inflowPlayed = useRef(new Set<string>());

  const statusQuery = useQuery({
    queryKey: queryKeys.gmailStatus,
    queryFn: () => api.getGmailStatus(token!),
    enabled: !!token,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data || data.status !== "connected") return false;
      const running = data.lastSync?.status === "running";
      return running || Date.now() < watchUntil ? FAST_POLL_MS : IDLE_POLL_MS;
    },
  });

  // A scheduled sync may have run while the app was in the background.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && token) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.gmailStatus });
      }
    });
    return () => subscription.remove();
  }, [queryClient, token]);

  useEffect(() => {
    storage
      .getItem(ANNOUNCED_KEY)
      .then((raw) => setAnnounced(raw ? (JSON.parse(raw) as Announced) : null))
      .catch(() => setAnnounced(null));
  }, []);

  // The notice is derived, not stored: it stays up until the user has actually seen it
  // (dismissNotice), so a remount before that just shows it again instead of losing it.
  const lastSync = statusQuery.data?.lastSync;
  const seenCount = announced && lastSync && announced.id === lastSync.id ? announced.count : 0;
  const fresh = lastSync && announced !== undefined ? lastSync.transactionsCreated - seenCount : 0;
  const notice = useMemo<InflowNotice | null>(
    () => (lastSync && fresh > 0 ? { key: lastSync.id, count: fresh } : null),
    [lastSync, fresh],
  );

  useEffect(() => {
    if (!lastSync || fresh <= 0) return;
    setInflowSince(new Date(lastSync.startedAt).getTime());
    void invalidateMoneyData(queryClient);
  }, [lastSync, fresh, queryClient]);

  // Read through a ref so dismissNotice stays stable across polls; otherwise the
  // toast's auto-dismiss timer restarts every time new status data arrives.
  const lastSyncRef = useRef(lastSync);
  useEffect(() => {
    lastSyncRef.current = lastSync;
  }, [lastSync]);

  const dismissNotice = useCallback(() => {
    const latest = lastSyncRef.current;
    if (!latest) return;
    const next = { id: latest.id, count: latest.transactionsCreated };
    setAnnounced(next);
    void storage.setItem(ANNOUNCED_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const trigger = useMutation({
    mutationFn: () => api.triggerGmailSync(token!),
  });

  const startSync = useCallback(async () => {
    setWatchUntil(Date.now() + WATCH_AFTER_TRIGGER_MS);
    await trigger.mutateAsync();
    await queryClient.invalidateQueries({ queryKey: queryKeys.gmailStatus });
  }, [trigger, queryClient]);

  const value = useMemo<SyncContextValue>(
    () => ({
      gmail: statusQuery.data,
      gmailLoading: statusQuery.isLoading,
      isSyncing: trigger.isPending || statusQuery.data?.lastSync?.status === "running",
      startSync,
      inflowSince,
      notice,
      dismissNotice,
      claimInflow: (transactionId: string) => {
        if (inflowPlayed.current.has(transactionId)) return false;
        inflowPlayed.current.add(transactionId);
        return true;
      },
    }),
    [
      statusQuery.data,
      statusQuery.isLoading,
      trigger.isPending,
      startSync,
      inflowSince,
      notice,
      dismissNotice,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return ctx;
}
