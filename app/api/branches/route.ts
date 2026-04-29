import dbConnect from '@/lib/mongodb';
import Branch from '@/lib/models/Branch';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();
    const branches = await Branch.find().sort({ createdAt: -1 });
    return NextResponse.json(branches);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const branch = await Branch.create(body);
    return NextResponse.json(branch, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 });
  }
}
