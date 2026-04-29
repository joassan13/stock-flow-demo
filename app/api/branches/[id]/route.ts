import dbConnect from '@/lib/mongodb';
import Branch from '@/lib/models/Branch';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const branch = await Branch.findById(id);
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }
    return NextResponse.json(branch);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch branch' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const branch = await Branch.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }
    return NextResponse.json(branch);
  } catch {
    return NextResponse.json({ error: 'Failed to update branch' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const branch = await Branch.findByIdAndDelete(id);
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Branch deleted' });
  } catch {
    return NextResponse.json({ error: 'Failed to delete branch' }, { status: 500 });
  }
}
