import type {
  CategoryDto,
  CreateTransactionInput,
  TransactionType,
} from "@budgetmail/shared-types";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AmountInput } from "@/components/form/amount-input";
import { CategoryPicker } from "@/components/form/category-picker";
import { DateField } from "@/components/form/date-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { spacing } from "@/theme/tokens";

export interface TransactionFormValues {
  type: TransactionType;
  amount: number;
  merchant: string;
  category: CategoryDto | null;
  date: Date;
}

export interface TransactionFormErrors {
  amount?: string;
  merchant?: string;
}

export function validateTransactionForm(values: TransactionFormValues): TransactionFormErrors {
  const errors: TransactionFormErrors = {};
  if (values.amount <= 0) errors.amount = "Masukkan nominal lebih dari 0";
  if (!values.merchant.trim()) {
    errors.merchant =
      values.type === "income" ? "Isi sumber pemasukan" : "Isi nama merchant/tempat";
  }
  return errors;
}

export function toTransactionInput(values: TransactionFormValues): CreateTransactionInput {
  return {
    type: values.type,
    amount: values.amount,
    merchant: values.merchant.trim(),
    categoryId: values.category?.id ?? null,
    transactionDate: values.date.toISOString(),
  };
}

export interface TransactionFormProps {
  values: TransactionFormValues;
  onChange: (values: TransactionFormValues) => void;
  errors: TransactionFormErrors;
  autoFocusAmount?: boolean;
}

export function TransactionForm({
  values,
  onChange,
  errors,
  autoFocusAmount,
}: TransactionFormProps) {
  const set = <K extends keyof TransactionFormValues>(key: K, value: TransactionFormValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <View style={styles.container}>
      <SegmentedControl
        accessibilityLabel="Jenis transaksi"
        value={values.type}
        onChange={(type) =>
          // Categories are typed, so switching type drops a mismatched category
          onChange({
            ...values,
            type,
            category: values.category?.type === type ? values.category : null,
          })
        }
        options={[
          { value: "expense", label: "Pengeluaran", tone: "expense" },
          { value: "income", label: "Pemasukan", tone: "income" },
        ]}
      />
      <AmountInput
        label="Nominal"
        value={values.amount}
        onChange={(amount) => set("amount", amount)}
        tone={values.type === "income" ? "income" : "expense"}
        error={errors.amount}
        autoFocus={autoFocusAmount}
      />
      <View style={styles.fields}>
        <TextField
          label={values.type === "income" ? "Sumber pemasukan" : "Merchant / tempat"}
          value={values.merchant}
          onChangeText={(merchant) => set("merchant", merchant)}
          maxLength={120}
          autoCapitalize="words"
          returnKeyType="done"
          error={errors.merchant}
        />
        <CategoryPicker
          type={values.type}
          value={values.category}
          onChange={(category) => set("category", category)}
        />
        <DateField label="Tanggal" value={values.date} onChange={(date) => set("date", date)} />
      </View>
    </View>
  );
}

export function useTransactionFormState(initial: TransactionFormValues) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<TransactionFormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const onChange = (next: TransactionFormValues) => {
    setValues(next);
    // Only re-validate live after the first submit, so errors don't show while typing
    if (submitted) setErrors(validateTransactionForm(next));
  };

  const validate = () => {
    setSubmitted(true);
    const nextErrors = validateTransactionForm(values);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  return { values, setValues, errors, onChange, validate };
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.four,
  },
  fields: {
    gap: spacing.three,
  },
});
