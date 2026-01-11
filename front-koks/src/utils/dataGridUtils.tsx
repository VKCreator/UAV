// src/utils/dataGridUtils.ts

export const formatEmptyToDash = (value: any): string => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

export const formatNumberOrDash = (value: number | null | undefined): string | number => {
  if (value === null || value === undefined) return "—";
  return value;
};