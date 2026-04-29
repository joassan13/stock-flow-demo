import dbConnect from '@/lib/mongodb';
import Movement from '@/lib/models/Movement';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const movement = await Movement.findById(id)
      .populate('product', 'name sku')
      .populate('fromBranch', 'name location')
      .populate('toBranch', 'name location');

    if (!movement) {
      return NextResponse.json({ error: 'Movement not found' }, { status: 404 });
    }
    return NextResponse.json(movement);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch movement' }, { status: 500 });
  }
}
