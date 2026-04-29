import dbConnect from '@/lib/mongodb';
import Movement from '@/lib/models/Movement';
import { MovementType } from '@/lib/models/Movement';
import { NextRequest, NextResponse } from 'next/server';

function validateMovementBody(
  type: MovementType,
  fromBranch: string | undefined,
  toBranch: string | undefined
): string | null {
  if (type === 'entry' && !toBranch) return "'toBranch' is required for entry movements";
  if (type === 'exit' && !fromBranch) return "'fromBranch' is required for exit movements";
  if (type === 'transfer' && (!fromBranch || !toBranch))
    return "'fromBranch' and 'toBranch' are required for transfer movements";
  if (type === 'transfer' && fromBranch === toBranch)
    return "'fromBranch' and 'toBranch' must be different for transfer movements";
  return null;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const branch = searchParams.get('branch');

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (branch) filter.$or = [{ fromBranch: branch }, { toBranch: branch }];

    const movements = await Movement.find(filter)
      .populate('product', 'name sku')
      .populate('fromBranch', 'name')
      .populate('toBranch', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json(movements);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    const body = await req.json();
    const { type, product, fromBranch, toBranch, quantity } = body;

    const validationError = validateMovementBody(type, fromBranch, toBranch);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 422 });
    }

    const movement = await Movement.create({
      type,
      product,
      fromBranch: fromBranch ?? null,
      toBranch: toBranch ?? null,
      quantity,
      status: 'pending',
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors)
        .map((e: any) => e.message)
        .join(', ');
      return NextResponse.json({ error: message }, { status: 422 });
    }
    return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 });
  }
}
