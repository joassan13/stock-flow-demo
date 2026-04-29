import dbConnect from '@/lib/mongodb';
import Movement from '@/lib/models/Movement';
import { processNextMovement } from '@/lib/worker';
import { NextResponse } from 'next/server';

// GET /api/worker — returns the count of pending movements
export async function GET() {
  try {
    await dbConnect();
    const pendingCount = await Movement.countDocuments({ status: 'pending' });
    return NextResponse.json({ pendingCount });
  } catch {
    return NextResponse.json({ error: 'Failed to check queue' }, { status: 500 });
  }
}

// POST /api/worker — processes the next pending movement
export async function POST() {
  try {
    const result = await processNextMovement();

    if (!result.processed && !result.error) {
      return NextResponse.json({ message: 'No pending movements' });
    }

    if (result.error) {
      return NextResponse.json(
        { message: 'Processing failed', movementId: result.movementId, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Movement processed',
      movementId: result.movementId,
    });
  } catch {
    return NextResponse.json({ error: 'Worker error' }, { status: 500 });
  }
}
