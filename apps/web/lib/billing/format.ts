import { CURRENCY } from './plans'

/** An amount in the smallest currency unit, e.g. 2900 → "$29", 2950 → "$29.50". */
export function formatMoney(args: {
  cents: number
  currency?: string
}): string {
  const whole = args.cents % 100 === 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (args.currency ?? CURRENCY).toUpperCase(),
    minimumFractionDigits: whole ? 0 : 2,
  }).format(args.cents / 100)
}

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

// TODO: these render on the server, so dates are in the Worker's time zone
// (UTC) — fine for billing dates, which Stripe also shows in UTC.
export function formatDate(date: Date): string {
  return dateFormat.format(date)
}
