// A notification must never unlock a digital download until the exact
// Zak Pay webhook-signature scheme and authoritative transaction verification
// have been implemented and tested. This endpoint intentionally does no writes.
export async function POST() {
  return new Response('Zak Pay notifications are not configured', {
    status: 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
