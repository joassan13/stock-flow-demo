import dbConnect from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ 
      status: "online", 
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ 
      status: "error", 
      message: "Database connection failed" 
    }, { status: 500 });
  }
}