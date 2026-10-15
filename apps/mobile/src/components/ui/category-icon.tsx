import type { CategoryDto } from "@budgetmail/shared-types";
import { StyleSheet, View } from "react-native";

import { categoryColor, categoryIcon, withAlpha } from "@/lib/category-style";
import { iconSize, iconStroke, layout, radius } from "@/theme/tokens";

export interface CategoryIconProps {
  category: Pick<CategoryDto, "id" | "name" | "icon"> | null | undefined;
  size?: "md" | "sm";
}

// A soft tint instead of a solid fill, so category colors don't compete with the
// income/expense colors.
export function CategoryIcon({ category, size = "md" }: CategoryIconProps) {
  const Icon = categoryIcon(category?.icon);
  const color = categoryColor(category);
  const dimension = size === "md" ? layout.categoryIcon : layout.categoryIconSmall;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        { width: dimension, height: dimension, backgroundColor: withAlpha(color, 0.16) },
      ]}
    >
      <Icon
        size={size === "md" ? iconSize.md : iconSize.sm}
        color={color}
        strokeWidth={iconStroke}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
