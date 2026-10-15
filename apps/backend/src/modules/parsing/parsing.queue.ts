import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import { TRANSACTION_PARSING_QUEUE, type TransactionParsingJobData } from "../../shared/queues.js";

export interface ParsingQueueProducer {
  enqueueParseEmail(data: TransactionParsingJobData): Promise<void>;
}

export class BullMqParsingQueueProducer implements ParsingQueueProducer {
  private readonly queue: Queue<TransactionParsingJobData>;

  constructor(connection: Redis) {
    this.queue = new Queue(TRANSACTION_PARSING_QUEUE, { connection });
  }

  async enqueueParseEmail(data: TransactionParsingJobData): Promise<void> {
    await this.queue.add("parse-email", data);
  }
}
