export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function formatDateOnly(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function todayDateOnly(today = new Date()): string {
  return formatDateOnly(today);
}

const dateOnlyLabelFormatter = new Intl.DateTimeFormat('es', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

export function formatDateOnlyLabel(value: string): string {
  return dateOnlyLabelFormatter.format(parseDateOnly(value));
}
