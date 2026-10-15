export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  month: string; // "YYYY-MM"
  amountLimit: number;
}
