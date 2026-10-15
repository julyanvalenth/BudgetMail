import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { setUnauthorizedHandler } from "@/api/client";
import * as storage from "@/lib/storage";

const TOKEN_KEY = "budgetmail_session_token";
// Set by "Nanti saja" on onboarding, so the app stops sending the user back there.
const ONBOARDING_SKIPPED_KEY = "budgetmail_onboarding_skipped";

interface AuthContextValue {
  token: string | null;
  isLoading: boolean;
  onboardingSkipped: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [onboardingSkipped, setOnboardingSkipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([storage.getItem(TOKEN_KEY), storage.getItem(ONBOARDING_SKIPPED_KEY)])
      .then(([storedToken, skipped]) => {
        setToken(storedToken);
        setOnboardingSkipped(skipped === "1");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signOut = useCallback(async () => {
    await storage.deleteItem(TOKEN_KEY);
    // The skip choice belongs to this account, not the device
    await storage.deleteItem(ONBOARDING_SKIPPED_KEY);
    setToken(null);
    setOnboardingSkipped(false);
    // Don't show this account's cached data to whoever logs in next
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isLoading,
      onboardingSkipped,
      signIn: async (newToken: string) => {
        await storage.setItem(TOKEN_KEY, newToken);
        setToken(newToken);
      },
      signOut,
      skipOnboarding: async () => {
        await storage.setItem(ONBOARDING_SKIPPED_KEY, "1");
        setOnboardingSkipped(true);
      },
    }),
    [token, isLoading, onboardingSkipped, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
