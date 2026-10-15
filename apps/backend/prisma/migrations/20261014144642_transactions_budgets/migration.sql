-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "amount_limit" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budgets_user_id_category_id_month_key" ON "budgets"("user_id", "category_id", "month");

-- CreateIndex
CREATE INDEX "transactions_user_id_transaction_date_idx" ON "transactions"("user_id", "transaction_date");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default/global categories (user_id NULL) per docs/PRD.md P0-8. Fixed ids +
-- ON CONFLICT keep this idempotent: the (user_id, name, type) unique index does not
-- dedupe rows whose user_id is NULL, so the primary key is the guard instead.
-- Icon values are lucide icon names rendered by apps/mobile.
INSERT INTO "categories" ("id", "user_id", "name", "icon", "type") VALUES
  ('default-expense-makanan', NULL, 'Makanan', 'utensils', 'expense'),
  ('default-expense-transport', NULL, 'Transport', 'car', 'expense'),
  ('default-expense-belanja', NULL, 'Belanja', 'shopping-bag', 'expense'),
  ('default-expense-tagihan', NULL, 'Tagihan', 'receipt', 'expense'),
  ('default-expense-hiburan', NULL, 'Hiburan', 'clapperboard', 'expense'),
  ('default-expense-kesehatan', NULL, 'Kesehatan', 'heart-pulse', 'expense'),
  ('default-expense-pendidikan', NULL, 'Pendidikan', 'graduation-cap', 'expense'),
  ('default-expense-lainnya', NULL, 'Lainnya', 'circle-ellipsis', 'expense'),
  ('default-income-gaji', NULL, 'Gaji', 'wallet', 'income'),
  ('default-income-transfer', NULL, 'Transfer Masuk', 'arrow-down-left', 'income'),
  ('default-income-lainnya', NULL, 'Lainnya', 'circle-ellipsis', 'income')
ON CONFLICT ("id") DO NOTHING;
