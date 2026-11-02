const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function money(n: number, opts: { whole?: boolean } = {}): string {
  return (opts.whole ? usd0 : usd).format(n);
}

/** Signed money, accounting style like the spreadsheet: ($12.34) for losses. */
export function net(n: number): string {
  const s = usd.format(Math.abs(n));
  return n < -0.004 ? `(${s})` : s;
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}
