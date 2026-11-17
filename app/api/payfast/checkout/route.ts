import { NextResponse } from 'next/server';

// Payfast has been retired for new orders. Keep the existing notification and
// status endpoints so older Payfast orders can still settle safely.
export async function POST() {
  return NextResponse.json({ error: 'Payfast checkout is no longer available. Please use SnapScan.' },
    { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
