interface CategoryKeywordRule {
  keywords: string[];
  category: string;
}

// Simple keyword mapping per docs/TASKS.md Fase 2 example ("Indomaret" -> Belanja,
// "Gojek/Grab" -> Transport). Not exhaustive - tuned further once real parsing data
// is available (see docs/PRD.md §12 Open Questions on confidence threshold tuning).
const CATEGORY_RULES: CategoryKeywordRule[] = [
  {
    keywords: ["indomaret", "alfamart", "alfamidi", "superindo", "hypermart"],
    category: "Belanja",
  },
  {
    keywords: ["gojek", "grab", "gocar", "grabcar", "spbu", "pertamina", "shell", "mrt", "krl"],
    category: "Transport",
  },
  {
    keywords: [
      "gofood",
      "grabfood",
      "shopeefood",
      "mcdonald",
      "kfc",
      "starbucks",
      "resto",
      "restoran",
      "cafe",
    ],
    category: "Makanan",
  },
  {
    keywords: ["pln", "pdam", "indihome", "telkomsel", "xl axiata", "smartfren", "listrik", "wifi"],
    category: "Tagihan",
  },
  { keywords: ["netflix", "spotify", "disney", "cinema", "xxi", "cgv"], category: "Hiburan" },
  { keywords: ["gaji", "payroll", "salary"], category: "Gaji" },
];

const FALLBACK_CATEGORY = "Lainnya";

export function suggestCategoryName(merchant: string): string {
  const normalized = merchant.toLowerCase();
  const match = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword)),
  );
  return match?.category ?? FALLBACK_CATEGORY;
}
