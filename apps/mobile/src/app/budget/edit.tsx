import type { BudgetProgressDto, CategoryDto } from "@budgetmail/shared-types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { errorMessage } from "@/api/client";
import { useBudgets, useDashboard, useDeleteBudget, useUpsertBudget } from "@/api/queries";
import { AmountInput } from "@/components/form/amount-input";
import { CategoryPicker } from "@/components/form/category-picker";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ModalScreen } from "@/components/ui/modal-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonthKey, formatMonth, formatRupiah } from "@/lib/format";
import { radius, spacing } from "@/theme/tokens";

export default function BudgetEditScreen() {
  const params = useLocalSearchParams<{ month?: string; categoryId?: string }>();
  const month = params.month ?? currentMonthKey();
  const budgets = useBudgets(month);

  if (budgets.isLoading) {
    return (
      <ModalScreen title="Set budget">
        <Skeleton height={64} rounded={radius.input} />
        <Skeleton height={96} />
      </ModalScreen>
    );
  }

  const existing = budgets.data?.find((budget) => budget.category.id === params.categoryId) ?? null;
  return <BudgetEditor month={month} existing={existing} budgets={budgets.data ?? []} />;
}

function BudgetEditor({
  month,
  existing,
  budgets,
}: {
  month: string;
  existing: BudgetProgressDto | null;
  budgets: BudgetProgressDto[];
}) {
  const router = useRouter();
  const upsert = useUpsertBudget();
  const remove = useDeleteBudget();
  const dashboard = useDashboard(month);
  const [category, setCategory] = useState<CategoryDto | null>(existing?.category ?? null);
  const [amount, setAmount] = useState(existing?.limit ?? 0);
  const [errors, setErrors] = useState<{ category?: string; amount?: string; submit?: string }>({});

  const spentSoFar = category
    ? (dashboard.data?.expenseByCategory.find((item) => item.category?.id === category.id)?.total ??
      0)
    : null;

  const save = async () => {
    const nextErrors: typeof errors = {};
    if (!category) nextErrors.category = "Pilih kategori pengeluaran";
    if (amount <= 0) nextErrors.amount = "Masukkan batas lebih dari 0";
    setErrors(nextErrors);
    if (!category || amount <= 0) return;
    try {
      await upsert.mutateAsync({ categoryId: category.id, month, amountLimit: amount });
      router.back();
    } catch (err) {
      setErrors({ submit: errorMessage(err) });
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(
      "Hapus budget ini?",
      `Batas untuk ${existing.category.name} di ${formatMonth(month)} akan dihapus.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () =>
            remove.mutate(existing.id, {
              onSuccess: () => router.back(),
              onError: (err) => setErrors({ submit: errorMessage(err) }),
            }),
        },
      ],
    );
  };

  return (
    <ModalScreen
      title={existing ? `Budget ${existing.category.name}` : "Set budget"}
      footer={
        <>
          {errors.submit && (
            <AppText variant="bodySmall" tone="danger" accessibilityLiveRegion="polite">
              {errors.submit}
            </AppText>
          )}
          <Button label="Simpan budget" onPress={save} loading={upsert.isPending} fullWidth />
          {existing && (
            <Button
              label="Hapus budget"
              icon={Trash2}
              variant="danger"
              onPress={confirmDelete}
              loading={remove.isPending}
              fullWidth
            />
          )}
        </>
      }
    >
      <AppText variant="bodySmall" tone="muted">
        Batas pengeluaran untuk {formatMonth(month)}. Hanya transaksi yang sudah dikonfirmasi yang
        dihitung.
      </AppText>
      <AmountInput
        label="Batas per bulan"
        value={amount}
        onChange={setAmount}
        error={errors.amount}
        autoFocus={!!existing}
      />
      <View style={styles.fields}>
        <CategoryPicker
          type="expense"
          label="Kategori pengeluaran"
          value={category}
          onChange={(next) => {
            setCategory(next);
            setErrors((current) => ({ ...current, category: undefined }));
          }}
          disabledIds={budgets.map((budget) => budget.category.id)}
          error={errors.category}
        />
        {spentSoFar !== null && (
          <AppText variant="caption" tone="muted" style={styles.hint}>
            Sudah terpakai {formatRupiah(spentSoFar)} untuk {category?.name} bulan ini.
          </AppText>
        )}
      </View>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: spacing.two,
  },
  hint: {
    fontVariant: ["tabular-nums"],
    paddingHorizontal: spacing.one,
  },
});
