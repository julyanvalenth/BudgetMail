import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";

import { connectGmail, errorMessage } from "@/api/client";
import { queryKeys } from "@/api/queries";
import { useAuth } from "@/hooks/use-auth";

const CALLBACK_URL = "budgetmail://gmail-connected";

// Opens Google's consent screen for gmail.readonly and returns through the
// budgetmail://gmail-connected deep link. Used by onboarding and the reconnect banners.
export function useConnectGmail() {
  const { token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    if (!token) return;
    setError(null);
    setIsConnecting(true);
    try {
      const { url } = await connectGmail(token);
      const result = await WebBrowser.openAuthSessionAsync(url, CALLBACK_URL);
      if (result.type === "success") {
        await queryClient.invalidateQueries({ queryKey: queryKeys.gmailStatus });
        router.replace("/gmail-connected");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsConnecting(false);
    }
  };

  return { connect, isConnecting, error };
}
