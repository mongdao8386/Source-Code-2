/**
 * The "someone tapped Telegram" beacon.
 *
 * PII-free and fire-and-forget: it must never delay or block the navigation
 * it accompanies, so failures are swallowed. Lived inside BookingButton until
 * the support links and the floating button needed the same call.
 */
export function trackBooking(modelId: string | null | undefined, locale: string): void {
  if (typeof window === 'undefined') return;
  void fetch('/api/track/booking', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ modelId: modelId ?? null, locale }),
    keepalive: true,
  }).catch(() => {});
}
