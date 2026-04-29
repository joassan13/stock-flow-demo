import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();
    const products = await Product.find().sort({ createdAt: -1 });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const product = await Product.create(body);
    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'SKU already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
