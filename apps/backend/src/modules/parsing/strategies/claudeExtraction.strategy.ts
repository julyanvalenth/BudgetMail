import Anthropic from "@anthropic-ai/sdk";
import {
  validateExtraction,
  type EmailForExtraction,
  type ExtractedTransaction,
  type TransactionExtractionStrategy,
} from "./extraction.strategy.js";

// Small/fast model per docs/TASKS.md cost-efficiency note - financial-email volume per
// user per month is small (tens-hundreds), so a bigger model isn't needed here.
const DEFAULT_EXTRACTION_MODEL = "claude-haiku-4-5-20251001";

const GENERIC_SYSTEM_PROMPT = `You extract structured transaction data from Indonesian bank/e-wallet
notification emails. Respond with ONLY a JSON object matching this shape, no prose, no
markdown fences:
{"merchant": string, "amount": number, "type": "income"|"expense", "date": string (ISO 8601),
"confidence": number between 0 and 1}
If the email is not a transaction notification (e.g. marketing, OTP, statement summary),
respond with {"merchant": "", "amount": 0, "type": "expense", "date": "", "confidence": 0}.
"amount" must be a positive number in Indonesian Rupiah (no currency symbol, no thousands
separators). "confidence" reflects how certain you are this is a real, correctly-extracted
transaction.`;

export interface ClaudeExtractionOptions {
  apiKey: string;
  model?: string;
  // Override to create a provider-tuned variant of this strategy (e.g. a prompt with
  // BCA-specific format hints) without duplicating the Anthropic plumbing.
  systemPrompt?: string;
}

export class ClaudeExtractionStrategy implements TransactionExtractionStrategy {
  private client: Anthropic | undefined;

  constructor(private readonly options: ClaudeExtractionOptions) {}

  // Lazy so importing/constructing the strategy never requires ANTHROPIC_API_KEY
  // (e.g. the API process builds the container but never extracts).
  private getClient(): Anthropic {
    this.client ??= new Anthropic({ apiKey: this.options.apiKey });
    return this.client;
  }

  async extract(email: EmailForExtraction): Promise<ExtractedTransaction> {
    const emailContent = `From: ${email.from}\nDate: ${email.date}\n\n${email.snippet}`;

    const response = await this.getClient().messages.create({
      model: this.options.model ?? DEFAULT_EXTRACTION_MODEL,
      max_tokens: 300,
      system: this.options.systemPrompt ?? GENERIC_SYSTEM_PROMPT,
      messages: [{ role: "user", content: emailContent }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude response did not contain a text block");
    }

    return validateExtraction(JSON.parse(textBlock.text));
  }
}
