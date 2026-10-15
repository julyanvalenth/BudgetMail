// Sender allowlist for the Gmail sync worker: only messages from senders whose
// address ends in one of a provider's `domains` are fetched/parsed.
//
// IMPORTANT - accuracy caveat (see docs/PRD.md §12 Open Questions, "Product"):
// these are best-effort *company domains*, not verified exact notification-sender
// addresses. Web research for this task could not confirm precise transaction-
// notification sender addresses for any of these providers (only general
// customer-service/marketing addresses turned up) - bank/e-wallet notification
// senders often use dedicated subdomains (e.g. "notifikasi@", "noreply@",
// "ebanking@") that vary and change over time. Before relying on this in
// production, verify against real inbox samples for each provider and narrow
// each entry to the exact sender address(es) observed, or at least confirm the
// domain is correct. `confidence: "unverified"` entries are the most likely to
// need correction.
export interface SenderAllowlistEntry {
  id: string;
  name: string;
  domains: string[];
  confidence: "domain_confirmed" | "unverified";
}

export const senderAllowlist: SenderAllowlistEntry[] = [
  {
    id: "bca",
    name: "BCA",
    domains: ["klikbca.com", "bca.co.id"],
    confidence: "domain_confirmed",
  },
  {
    id: "mandiri",
    name: "Bank Mandiri / Livin' by Mandiri",
    domains: ["bankmandiri.co.id"],
    confidence: "unverified",
  },
  {
    id: "bri",
    name: "BRI / BRImo",
    domains: ["bri.co.id"],
    confidence: "unverified",
  },
  {
    id: "bni",
    name: "BNI / BNI Mobile Banking",
    domains: ["bni.co.id"],
    confidence: "unverified",
  },
  {
    id: "gopay",
    name: "GoPay",
    domains: ["gopay.co.id", "gojek.com"],
    confidence: "unverified",
  },
  {
    id: "ovo",
    name: "OVO",
    domains: ["ovo.id"],
    confidence: "unverified",
  },
  {
    id: "dana",
    name: "DANA",
    domains: ["dana.id"],
    confidence: "unverified",
  },
  {
    id: "shopeepay",
    name: "ShopeePay",
    domains: ["shopeepay.co.id", "shopee.co.id"],
    confidence: "unverified",
  },
];

// Returns the allowlist entry whose domain matches the From header, so callers can
// key per-provider behavior (e.g. a bank-specific extraction strategy) off entry.id.
export function matchAllowlistedSender(fromHeader: string): SenderAllowlistEntry | undefined {
  const match = /<?([^<>\s@]+@[^<>\s@]+)>?$/.exec(fromHeader.trim());
  const address = (match?.[1] ?? fromHeader).toLowerCase();
  return senderAllowlist.find((entry) =>
    entry.domains.some((domain) => address.endsWith(`@${domain}`)),
  );
}

export function isAllowlistedSender(fromHeader: string): boolean {
  return matchAllowlistedSender(fromHeader) !== undefined;
}

// Gmail search query fragment, e.g. "from:(@klikbca.com OR @bca.co.id OR ...)"
export function buildAllowlistQuery(): string {
  const domains = senderAllowlist.flatMap((entry) => entry.domains);
  return `from:(${domains.map((domain) => `@${domain}`).join(" OR ")})`;
}
