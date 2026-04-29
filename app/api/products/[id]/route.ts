import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const product = await Product.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await dbConnect();
    const { id } = await params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Product deleted' });
  } catch {
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
