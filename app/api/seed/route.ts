import { NextRequest, NextResponse } from 'next/server';
import { POST as demoSeedPost } from '../demo/seed/route';

export async function POST(req: NextRequest) {
  return demoSeedPost(req);
}
