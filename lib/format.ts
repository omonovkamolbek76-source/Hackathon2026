export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU').format(amount) + " so'm";
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('ru-RU').format(amount);
}

export function formatCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(1).replace('.0', '') + ' mlrd';
  }
  if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace('.0', '') + ' mln';
  }
  if (amount >= 1_000) {
    return (amount / 1_000).toFixed(0) + ' ming';
  }
  return String(amount);
}
