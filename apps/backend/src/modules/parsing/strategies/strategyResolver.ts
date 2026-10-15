import { matchAllowlistedSender } from "../senderAllowlist.js";
import type { TransactionExtractionStrategy } from "./extraction.strategy.js";

// Picks the extraction strategy for an email based on its sender. Provider ids are
// the `id` values in senderAllowlist.ts. Today no provider has a dedicated strategy,
// so everything falls through to the generic default - register one here (via the
// container) when tuning extraction for a specific bank/e-wallet.
export class ExtractionStrategyResolver {
  constructor(
    private readonly defaultStrategy: TransactionExtractionStrategy,
    private readonly providerStrategies: ReadonlyMap<
      string,
      TransactionExtractionStrategy
    > = new Map(),
  ) {}

  resolveForSender(fromHeader: string): TransactionExtractionStrategy {
    const provider = matchAllowlistedSender(fromHeader);
    if (provider) {
      const strategy = this.providerStrategies.get(provider.id);
      if (strategy) {
        return strategy;
      }
    }
    return this.defaultStrategy;
  }
}
