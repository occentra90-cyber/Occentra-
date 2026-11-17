import { NextResponse } from 'next/server';
import { snapscanConfigured } from '../../../../lib/snapscan';

export async function GET() {
  return NextResponse.json({ available: snapscanConfigured() }, { headers: { 'Cache-Control': 'no-store' } });
}
