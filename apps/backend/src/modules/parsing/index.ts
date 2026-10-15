// Public API of the parsing module - other modules import only from here.
export { suggestCategoryName } from "./categorySuggestion.js";
export { EmailParsingService } from "./emailParsing.service.js";
export type {
  EmailFetcher,
  EmailParsingDeps,
  FetchedEmail,
  SyncProgressTracker,
} from "./emailParsing.service.js";
export { BullMqParsingQueueProducer } from "./parsing.queue.js";
export type { ParsingQueueProducer } from "./parsing.queue.js";
export { startTransactionParsingWorker } from "./parsing.worker.js";
export {
  buildAllowlistQuery,
  isAllowlistedSender,
  matchAllowlistedSender,
  senderAllowlist,
} from "./senderAllowlist.js";
export type { SenderAllowlistEntry } from "./senderAllowlist.js";
export { ClaudeExtractionStrategy } from "./strategies/claudeExtraction.strategy.js";
export type { ClaudeExtractionOptions } from "./strategies/claudeExtraction.strategy.js";
export { RuleBasedExtractionStrategy } from "./strategies/ruleBasedExtraction.strategy.js";
export { validateExtraction } from "./strategies/extraction.strategy.js";
export type {
  EmailForExtraction,
  ExtractedTransaction,
  TransactionExtractionStrategy,
} from "./strategies/extraction.strategy.js";
export { ExtractionStrategyResolver } from "./strategies/strategyResolver.js";
