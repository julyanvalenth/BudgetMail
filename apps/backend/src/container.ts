import type { PrismaClient } from "@prisma/client";
import type { Redis } from "ioredis";
import {
  AuthService,
  GoogleAuthGateway,
  PrismaUserRepository,
  type UserRepository,
} from "./modules/auth/index.js";
import {
  BudgetService,
  PrismaBudgetRepository,
  type BudgetRepository,
} from "./modules/budgets/index.js";
import {
  CategoryService,
  PrismaCategoryRepository,
  type CategoryRepository,
} from "./modules/categories/index.js";
import { DashboardService } from "./modules/dashboard/index.js";
import {
  BullMqSyncQueueProducer,
  GmailApiService,
  PrismaGmailConnectionRepository,
  PrismaSyncJobRepository,
  SyncService,
  type GmailConnectionRepository,
  type SyncJobRepository,
  type SyncQueueProducer,
} from "./modules/gmail-sync/index.js";
import {
  BullMqParsingQueueProducer,
  ClaudeExtractionStrategy,
  EmailParsingService,
  ExtractionStrategyResolver,
  RuleBasedExtractionStrategy,
  type ParsingQueueProducer,
  type TransactionExtractionStrategy,
} from "./modules/parsing/index.js";
import {
  PrismaTransactionRepository,
  TransactionService,
  type TransactionRepository,
} from "./modules/transactions/index.js";
import { env } from "./shared/env.js";
import { createPrismaClient } from "./shared/prisma.js";
import { createRedisConnection } from "./shared/redis.js";

// Composition root: the only place that knows how every repository/service/queue is
// constructed and wired together. Both processes (API in index.ts, workers in
// workers/index.ts) build their object graph exclusively from here.
export interface Container {
  prisma: PrismaClient;
  redis: Redis;
  // repositories
  users: UserRepository;
  connections: GmailConnectionRepository;
  syncJobs: SyncJobRepository;
  transactions: TransactionRepository;
  categories: CategoryRepository;
  budgets: BudgetRepository;
  // queue producers
  syncQueue: SyncQueueProducer;
  parsingQueue: ParsingQueueProducer;
  // services
  googleAuth: GoogleAuthGateway;
  authService: AuthService;
  gmailApi: GmailApiService;
  syncService: SyncService;
  parsingService: EmailParsingService;
  categoryService: CategoryService;
  transactionService: TransactionService;
  budgetService: BudgetService;
  dashboardService: DashboardService;
}

export function createContainer(): Container {
  const prisma = createPrismaClient();
  const redis = createRedisConnection();

  const users = new PrismaUserRepository(prisma);
  const connections = new PrismaGmailConnectionRepository(prisma);
  const syncJobs = new PrismaSyncJobRepository(prisma);
  const transactions = new PrismaTransactionRepository(prisma);
  const categories = new PrismaCategoryRepository(prisma);
  const budgets = new PrismaBudgetRepository(prisma);

  const syncQueue = new BullMqSyncQueueProducer(redis);
  const parsingQueue = new BullMqParsingQueueProducer(redis);

  const googleAuth = new GoogleAuthGateway(env.googleClientId, env.googleClientSecret);
  const authService = new AuthService(users, googleAuth);

  const gmailApi = new GmailApiService(connections, {
    clientId: env.googleClientId,
    clientSecret: env.googleClientSecret,
  });

  const syncService = new SyncService({
    db: prisma,
    gmail: gmailApi,
    connections,
    syncJobs,
    transactions,
    parsingQueue,
  });

  // Extraction runs without any LLM by default; the Claude strategy is opt-in and
  // only used when ANTHROPIC_API_KEY is set. All providers share the default
  // strategy today; add per-provider entries to the map (keyed by senderAllowlist
  // ids) when tuning a specific bank.
  const defaultExtractionStrategy: TransactionExtractionStrategy = env.anthropicApiKey
    ? new ClaudeExtractionStrategy({ apiKey: env.anthropicApiKey })
    : new RuleBasedExtractionStrategy();
  const strategyResolver = new ExtractionStrategyResolver(defaultExtractionStrategy);

  const parsingService = new EmailParsingService({
    emails: gmailApi,
    strategies: strategyResolver,
    transactions,
    categories,
    syncProgress: syncJobs,
  });

  const categoryService = new CategoryService(categories);
  const transactionService = new TransactionService({ transactions, categories });
  const budgetService = new BudgetService({ budgets, categories, transactions });
  const dashboardService = new DashboardService({ transactions, categories, budgets });

  return {
    prisma,
    redis,
    users,
    connections,
    syncJobs,
    transactions,
    categories,
    budgets,
    syncQueue,
    parsingQueue,
    googleAuth,
    authService,
    gmailApi,
    syncService,
    parsingService,
    categoryService,
    transactionService,
    budgetService,
    dashboardService,
  };
}
