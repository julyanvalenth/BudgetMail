import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { formatLongDate, isSameDay, monthName, WEEKDAYS_SHORT } from "@/lib/format";
import { colors, iconSize, iconStroke, layout, radius, spacing } from "@/theme/tokens";

export interface DateFieldProps {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}

// Monday-first, as on Indonesian calendars
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// Own calendar instead of the native pickers, so it looks the same on iOS, Android
// and web. Future dates are disabled.
export function DateField({ label, value, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: value.getFullYear(), month: value.getMonth() });
  const today = new Date();
  const atCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth();

  const shiftView = (delta: number) => {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  const pick = (day: Date) => {
    // Keep the time of day; Gmail entries carry a real timestamp
    const next = new Date(day);
    next.setHours(value.getHours(), value.getMinutes(), value.getSeconds(), 0);
    onChange(next > today ? today : next);
    setOpen(false);
  };

  return (
    <>
      <PressableScale
        accessibilityLabel={`${label}: ${formatLongDate(value)}`}
        accessibilityHint="Pilih tanggal"
        onPress={() => {
          setView({ year: value.getFullYear(), month: value.getMonth() });
          setOpen(true);
        }}
        scaleTo={0.99}
        style={styles.field}
      >
        <View style={styles.icon}>
          <Calendar size={iconSize.sm} color={colors.textMuted} strokeWidth={iconStroke} />
        </View>
        <View style={styles.fieldText}>
          <AppText variant="caption" tone="muted">
            {label}
          </AppText>
          <AppText variant="bodyMedium">{formatLongDate(value)}</AppText>
        </View>
        <ChevronRight size={iconSize.md} color={colors.textMuted} strokeWidth={iconStroke} />
      </PressableScale>

      <BottomSheet visible={open} title={label} onClose={() => setOpen(false)}>
        <View style={styles.calendar}>
          <View style={styles.monthRow}>
            <IconButton
              icon={ChevronLeft}
              label="Bulan sebelumnya"
              variant="plain"
              onPress={() => shiftView(-1)}
            />
            <AppText
              variant="bodyStrong"
              align="center"
              style={styles.monthLabel}
              accessibilityLiveRegion="polite"
            >
              {monthName(view.month)} {view.year}
            </AppText>
            <IconButton
              icon={ChevronRight}
              label="Bulan berikutnya"
              variant="plain"
              disabled={atCurrentMonth}
              onPress={() => shiftView(1)}
            />
          </View>
          <View style={styles.week}>
            {WEEK_ORDER.map((weekday) => (
              <AppText
                key={weekday}
                variant="caption"
                tone="muted"
                align="center"
                style={styles.cell}
              >
                {WEEKDAYS_SHORT[weekday]}
              </AppText>
            ))}
          </View>
          <View style={styles.grid}>
            {buildMonthGrid(view.year, view.month).map((day, index) => {
              if (!day) return <View key={`empty-${index}`} style={styles.cell} />;
              const selected = isSameDay(day, value);
              const isToday = isSameDay(day, today);
              const future = day > today && !isToday;
              return (
                <PressableScale
                  key={day.toISOString()}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: future }}
                  accessibilityLabel={formatLongDate(day)}
                  disabled={future}
                  onPress={() => pick(day)}
                  style={styles.cell}
                >
                  <View style={[styles.day, isToday && styles.today, selected && styles.selected]}>
                    <AppText variant="bodySmallStrong" tone={selected ? "onBrand" : "primary"}>
                      {day.getDate()}
                    </AppText>
                  </View>
                </PressableScale>
              );
            })}
          </View>
          <Button label="Hari ini" variant="secondary" onPress={() => pick(today)} />
        </View>
      </BottomSheet>
    </>
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
  icon: {
    width: layout.categoryIconSmall,
    height: layout.categoryIconSmall,
    borderRadius: radius.pill,
    backgroundColor: colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldText: {
    flex: 1,
  },
  calendar: {
    gap: spacing.three,
    paddingBottom: spacing.two,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthLabel: {
    flex: 1,
  },
  week: {
    flexDirection: "row",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    height: layout.touchTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  day: {
    width: layout.touchTarget - spacing.one,
    height: layout.touchTarget - spacing.one,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  today: {
    borderWidth: layout.hairline,
    borderColor: colors.brandTeal,
  },
  selected: {
    backgroundColor: colors.brandTeal,
  },
});
