import { useRouter } from "expo-router";
import { useState } from "react";

import { errorMessage } from "@/api/client";
import { useCreateTransaction } from "@/api/queries";
import {
  toTransactionInput,
  TransactionForm,
  useTransactionFormState,
} from "@/components/form/transaction-form";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { ModalScreen } from "@/components/ui/modal-screen";

// Manual entries (e.g. cash) are saved as confirmed.
export default function NewTransactionScreen() {
  const router = useRouter();
  const createTransaction = useCreateTransaction();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useTransactionFormState({
    type: "expense",
    amount: 0,
    merchant: "",
    category: null,
    date: new Date(),
  });

  const save = async () => {
    if (!form.validate()) return;
    setSubmitError(null);
    try {
      await createTransaction.mutateAsync(toTransactionInput(form.values));
      router.back();
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  };

  return (
    <ModalScreen
      title="Transaksi baru"
      footer={
        <>
          {submitError && (
            <AppText variant="bodySmall" tone="danger" accessibilityLiveRegion="polite">
              {submitError}
            </AppText>
          )}
          <Button
            label="Simpan transaksi"
            onPress={save}
            loading={createTransaction.isPending}
            fullWidth
          />
        </>
      }
    >
      <TransactionForm
        values={form.values}
        onChange={form.onChange}
        errors={form.errors}
        autoFocusAmount
      />
    </ModalScreen>
  );
}
