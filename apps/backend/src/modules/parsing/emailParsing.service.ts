import type { TransactionParsingJobData } from "../../shared/queues.js";
import type { CategoryRepository } from "../categories/index.js";
import type { TransactionRepository } from "../transactions/index.js";
import { suggestCategoryName } from "./categorySuggestion.js";
import type { ExtractionStrategyResolver } from "./strategies/strategyResolver.js";

// Conservative starting threshold per docs/TASKS.md Fase 2 - tune once real parsing
// data is available (see docs/PRD.md §12 Open Questions).
const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;

// Contracts owned by this module (dependency inversion): the gmail-sync module's
// GmailApiService and PrismaSyncJobRepository satisfy these structurally, so parsing
// never imports from gmail-sync and the module graph stays acyclic.
export interface FetchedEmail {
  gmailMessageId: string;
  from: string;
  date: string;
  snippet: string;
}

export interface EmailFetcher {
  fetchEmail(userId: string, gmailMessageId: string): Promise<FetchedEmail>;
}

export interface SyncProgressTracker {
  incrementTransactionsCreated(syncJobId: string): Promise<void>;
}

export interface EmailParsingDeps {
  emails: EmailFetcher;
  strategies: ExtractionStrategyResolver;
  transactions: TransactionRepository;
  categories: CategoryRepository;
  syncProgress: SyncProgressTracker;
  confidenceThreshold?: number;
}

export class EmailParsingService {
  private readonly confidenceThreshold: number;

  constructor(private readonly deps: EmailParsingDeps) {
    this.confidenceThreshold = deps.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  }

  async parseEmail({ userId, gmailMessageId, syncJobId }: TransactionParsingJobData) {
    const { emails, strategies, transactions, categories, syncProgress } = this.deps;

    const existing = await transactions.findByGmailMessageId(gmailMessageId);
    if (existing) {
      return; // dedupe check per docs/TASKS.md Fase 2
    }

    const email = await emails.fetchEmail(userId, gmailMessageId);
    const extracted = await strategies.resolveForSender(email.from).extract(email);

    if (extracted.merchant === "" || extracted.amount <= 0) {
      return; // not a real transaction (OTP, marketing, statement summary, etc.)
    }

    const categoryName = suggestCategoryName(extracted.merchant);
    const category = await categories.findOrCreateByName(userId, categoryName, extracted.type);

    const status =
      extracted.confidence >= this.confidenceThreshold ? "confirmed" : "pending_review";
    const created = await transactions.createFromGmail({
      userId,
      gmailMessageId,
      merchant: extracted.merchant,
      amount: extracted.amount,
      type: extracted.type,
      categoryId: category.id,
      transactionDate: new Date(extracted.date || email.date),
      confidenceScore: extracted.confidence,
      status,
      // Keep the snippet only while the user still has to review the entry (PRD §12).
      rawSnippet: status === "pending_review" ? email.snippet : null,
    });
    if (!created) {
      return; // race: another job already inserted this message
    }

    await syncProgress.incrementTransactionsCreated(syncJobId);
  }
}
