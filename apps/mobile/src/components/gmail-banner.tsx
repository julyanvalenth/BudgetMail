import { MailPlus, Unplug } from "lucide-react-native";

import { Notice } from "@/components/ui/notice";
import { useConnectGmail } from "@/hooks/use-connect-gmail";
import { useSync } from "@/hooks/use-sync";

// Renders nothing while Gmail is connected.
export function GmailBanner() {
  const { gmail } = useSync();
  const { connect, isConnecting, error } = useConnectGmail();

  if (!gmail || gmail.status === "connected") return null;

  if (gmail.status === "token_expired") {
    return (
      <Notice
        icon={Unplug}
        tone="danger"
        title="Koneksi Gmail terputus"
        body={error ?? "Sambungkan ulang untuk lanjut menangkap transaksimu."}
        actionLabel="Hubungkan ulang Gmail"
        onAction={connect}
        actionLoading={isConnecting}
      />
    );
  }

  return (
    <Notice
      icon={MailPlus}
      tone="brand"
      title="Transaksimu belum tersinkron"
      body={error ?? "Hubungkan Gmail dan biarkan sisanya berjalan otomatis."}
      actionLabel="Hubungkan Gmail"
      onAction={connect}
      actionLoading={isConnecting}
    />
  );
}
