export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function todayDateOnlyString(): string {
  return new Date().toISOString().slice(0, 10);
}
