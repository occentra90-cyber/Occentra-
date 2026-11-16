import { NextResponse } from 'next/server';

// Intentionally fail-closed while Zak Pay merchant verification and the official
// session-creation API details are pending. No payments or purchase records
// are created by this endpoint yet.
export async function POST() {
  return NextResponse.json(
    { error: 'Zak Pay checkout is not available yet.' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
