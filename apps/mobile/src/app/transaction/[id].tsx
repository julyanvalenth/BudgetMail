import type { TransactionDetailDto } from "@budgetmail/shared-types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleAlert, CloudOff, EyeOff, Mail, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { errorMessage } from "@/api/client";
import { useDeleteTransaction, useTransaction, useUpdateTransaction } from "@/api/queries";
import {
  toTransactionInput,
  TransactionForm,
  useTransactionFormState,
} from "@/components/form/transaction-form";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ModalScreen } from "@/components/ui/modal-screen";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/format";
import { colors, iconSize, iconStroke, radius, spacing } from "@/theme/tokens";

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const transaction = useTransaction(id);

  if (transaction.isLoading) {
    return (
      <ModalScreen title="Detail transaksi">
        <Skeleton height={spacing.twelve} rounded={radius.pill} />
        <Skeleton height={96} />
        <Skeleton height={64} rounded={radius.input} />
        <Skeleton height={64} rounded={radius.input} />
      </ModalScreen>
    );
  }
  if (!transaction.data) {
    return (
      <ModalScreen title="Detail transaksi">
        <EmptyState
          icon={CloudOff}
          tone="danger"
          title="Transaksi tidak bisa dimuat"
          body="Transaksi ini mungkin sudah dihapus, atau koneksimu sedang bermasalah."
          action={
            <Button label="Coba lagi" variant="secondary" onPress={() => transaction.refetch()} />
          }
        />
      </ModalScreen>
    );
  }
  // Keyed so the form resets if the route loads a different transaction
  return <EditTransaction key={transaction.data.id} transaction={transaction.data} />;
}

function EditTransaction({ transaction }: { transaction: TransactionDetailDto }) {
  const router = useRouter();
  const update = useUpdateTransaction(transaction.id);
  const remove = useDeleteTransaction();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useTransactionFormState({
    type: transaction.type,
    amount: transaction.amount,
    merchant: transaction.merchant,
    category: transaction.category,
    date: new Date(transaction.transactionDate),
  });

  const pending = transaction.status === "pending_review";
  const fromGmail = transaction.source === "gmail";

  const save = async () => {
    if (!form.validate()) return;
    setSubmitError(null);
    try {
      // Saving a reviewed entry confirms it, so it counts toward totals and budgets
      await update.mutateAsync({ ...toTransactionInput(form.values), status: "confirmed" });
      router.back();
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      fromGmail ? "Abaikan transaksi ini?" : "Hapus transaksi ini?",
      fromGmail
        ? "Transaksi disembunyikan dari daftar & ringkasan, dan email yang sama tidak akan diimpor ulang."
        : "Transaksi manual ini akan dihapus permanen.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: fromGmail ? "Abaikan" : "Hapus",
          style: "destructive",
          onPress: () =>
            remove.mutate(transaction.id, {
              onSuccess: () => router.back(),
              onError: (err) => setSubmitError(errorMessage(err)),
            }),
        },
      ],
    );

  return (
    <ModalScreen
      title={pending ? "Tinjau transaksi" : "Detail transaksi"}
      footer={
        <>
          {submitError && (
            <AppText variant="bodySmall" tone="danger" accessibilityLiveRegion="polite">
              {submitError}
            </AppText>
          )}
          <Button
            label={pending ? "Konfirmasi transaksi" : "Simpan perubahan"}
            onPress={save}
            loading={update.isPending}
            fullWidth
          />
          <Button
            label={fromGmail ? "Abaikan transaksi" : "Hapus transaksi"}
            icon={fromGmail ? EyeOff : Trash2}
            variant="danger"
            onPress={confirmDelete}
            loading={remove.isPending}
            fullWidth
          />
        </>
      }
    >
      {pending && (
        <Notice
          icon={CircleAlert}
          tone="warning"
          title="Hasil deteksi belum pasti"
          body="Periksa nominal, merchant, dan kategori di bawah, lalu konfirmasi agar ikut dihitung."
        />
      )}

      <TransactionForm values={form.values} onChange={form.onChange} errors={form.errors} />

      {fromGmail && (
        <Card style={styles.source}>
          <View style={styles.sourceHeader}>
            <Mail size={iconSize.sm} color={colors.textMuted} strokeWidth={iconStroke} />
            <AppText variant="bodySmallStrong" style={styles.flex}>
              Terdeteksi dari Gmail
            </AppText>
            {transaction.confidenceScore !== null && (
              <AppText variant="caption" tone="muted">
                Keyakinan {formatPercent(transaction.confidenceScore)}
              </AppText>
            )}
          </View>
          {transaction.rawSnippet && (
            <View style={styles.snippet}>
              <AppText variant="bodySmall" tone="muted" selectable>
                {transaction.rawSnippet}
              </AppText>
            </View>
          )}
        </Card>
      )}
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  source: {
    gap: spacing.three,
  },
  sourceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.two,
  },
  flex: {
    flex: 1,
  },
  snippet: {
    backgroundColor: colors.bgRaised,
    borderRadius: radius.input,
    padding: spacing.three,
  },
});
