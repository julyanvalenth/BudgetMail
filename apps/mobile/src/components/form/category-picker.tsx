import type { CategoryDto, CategoryType } from "@budgetmail/shared-types";
import { Check, ChevronRight, Plus } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { errorMessage } from "@/api/client";
import { useCategories, useCreateCategory } from "@/api/queries";
import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { categoryIcon, CUSTOM_CATEGORY_ICONS } from "@/lib/category-style";
import { colors, iconSize, iconStroke, layout, radius, spacing } from "@/theme/tokens";

export interface CategoryPickerProps {
  type: CategoryType;
  value: CategoryDto | null;
  onChange: (category: CategoryDto) => void;
  label?: string;
  // Categories that can't be chosen (e.g. already budgeted this month)
  disabledIds?: string[];
  error?: string | null;
}

export function CategoryPicker({
  type,
  value,
  onChange,
  label = "Kategori",
  disabledIds = [],
  error,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const categories = useCategories();
  const options = (categories.data ?? []).filter((category) => category.type === type);

  const select = (category: CategoryDto) => {
    onChange(category);
    setOpen(false);
    setCreating(false);
  };

  return (
    <>
      <PressableScale
        accessibilityLabel={`${label}: ${value?.name ?? "belum dipilih"}`}
        accessibilityHint="Pilih kategori"
        onPress={() => setOpen(true)}
        scaleTo={0.99}
        style={[styles.field, !!error && styles.fieldError]}
      >
        <CategoryIcon category={value} size="sm" />
        <View style={styles.fieldText}>
          <AppText variant="caption" tone="muted">
            {label}
          </AppText>
          <AppText variant="bodyMedium" tone={value ? "primary" : "muted"}>
            {value?.name ?? "Pilih kategori"}
          </AppText>
        </View>
        <ChevronRight size={iconSize.md} color={colors.textMuted} strokeWidth={iconStroke} />
      </PressableScale>
      {error ? (
        <AppText variant="caption" tone="danger">
          {error}
        </AppText>
      ) : null}

      <BottomSheet
        visible={open}
        title={creating ? "Kategori baru" : label}
        onClose={() => {
          setOpen(false);
          setCreating(false);
        }}
      >
        {creating ? (
          <NewCategoryForm type={type} onCreated={select} onCancel={() => setCreating(false)} />
        ) : (
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {categories.isLoading &&
              [0, 1, 2, 3].map((index) => <Skeleton key={index} height={layout.touchTarget} />)}
            {options.map((category) => {
              const selected = category.id === value?.id;
              const disabled = disabledIds.includes(category.id) && !selected;
              return (
                <PressableScale
                  key={category.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected, disabled }}
                  accessibilityLabel={
                    disabled ? `${category.name}, sudah punya budget` : category.name
                  }
                  disabled={disabled}
                  onPress={() => select(category)}
                  scaleTo={0.99}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <CategoryIcon category={category} size="sm" />
                  <AppText variant="bodyMedium" style={styles.optionLabel}>
                    {category.name}
                  </AppText>
                  {disabled && (
                    <AppText variant="caption" tone="muted">
                      Sudah diset
                    </AppText>
                  )}
                  {selected && (
                    <Check size={iconSize.md} color={colors.brandTeal} strokeWidth={iconStroke} />
                  )}
                </PressableScale>
              );
            })}
            <Button
              label="Tambah kategori baru"
              icon={Plus}
              variant="ghost"
              onPress={() => setCreating(true)}
              style={styles.addButton}
            />
          </ScrollView>
        )}
      </BottomSheet>
    </>
  );
}

function NewCategoryForm({
  type,
  onCreated,
  onCancel,
}: {
  type: CategoryType;
  onCreated: (category: CategoryDto) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(CUSTOM_CATEGORY_ICONS[0]);
  const [error, setError] = useState<string | null>(null);
  const createCategory = useCreateCategory();

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Nama kategori wajib diisi");
      return;
    }
    setError(null);
    try {
      onCreated(await createCategory.mutateAsync({ name: trimmed, type, icon }));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <TextField
        label="Nama kategori"
        value={name}
        onChangeText={setName}
        maxLength={40}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
        error={error}
      />
      <AppText variant="caption" tone="muted">
        Ikon
      </AppText>
      <View
        style={styles.iconGrid}
        accessibilityRole="radiogroup"
        accessibilityLabel="Ikon kategori"
      >
        {CUSTOM_CATEGORY_ICONS.map((option) => {
          const Icon = categoryIcon(option);
          const selected = option === icon;
          return (
            <PressableScale
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Ikon ${option}`}
              onPress={() => setIcon(option)}
              style={[styles.iconOption, selected && styles.iconOptionSelected]}
            >
              <Icon
                size={iconSize.md}
                color={selected ? colors.brandTeal : colors.textMuted}
                strokeWidth={iconStroke}
              />
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.formActions}>
        <Button label="Batal" variant="secondary" onPress={onCancel} style={styles.flex} />
        <Button
          label="Simpan"
          onPress={submit}
          loading={createCategory.isPending}
          style={styles.flex}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.three,
    minHeight: layout.touchTarget + spacing.five,
    paddingHorizontal: spacing.four,
    borderRadius: radius.input,
    backgroundColor: colors.bgRaised,
    borderWidth: layout.hairline,
    borderColor: colors.borderHairline,
  },
  fieldError: {
    borderColor: colors.signalDanger,
  },
  fieldText: {
    flex: 1,
  },
  list: {
    gap: spacing.one,
    paddingBottom: spacing.four,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.three,
    minHeight: layout.touchTarget + spacing.two,
    paddingHorizontal: spacing.three,
    borderRadius: radius.input,
  },
  optionSelected: {
    backgroundColor: colors.bgRaised,
  },
  optionLabel: {
    flex: 1,
  },
  addButton: {
    alignSelf: "flex-start",
    marginTop: spacing.two,
  },
  form: {
    gap: spacing.four,
    paddingBottom: spacing.four,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.two,
  },
  iconOption: {
    width: layout.touchTarget + spacing.one,
    height: layout.touchTarget + spacing.one,
    borderRadius: radius.input,
    borderWidth: layout.hairline,
    borderColor: colors.borderHairline,
    backgroundColor: colors.bgRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOptionSelected: {
    borderColor: colors.brandTeal,
    backgroundColor: colors.tintBrand,
  },
  formActions: {
    flexDirection: "row",
    gap: spacing.three,
  },
  flex: {
    flex: 1,
  },
});
