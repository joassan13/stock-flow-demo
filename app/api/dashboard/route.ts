import dbConnect from '@/lib/mongodb';
import Branch from '@/lib/models/Branch';
import Movement from '@/lib/models/Movement';
import Product from '@/lib/models/Product';
import Stock from '@/lib/models/Stock';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await dbConnect();

    const [products, stockRecords, branchCount, pendingCount, processedCount, failedCount] =
      await Promise.all([
        Product.find().sort({ name: 1 }).lean(),
        Stock.find().populate('branch', 'name location').lean(),
        Branch.countDocuments(),
        Movement.countDocuments({ status: 'pending' }),
        Movement.countDocuments({ status: 'processed' }),
        Movement.countDocuments({ status: 'failed' }),
      ]);

    const stockByProduct = (stockRecords as any[]).reduce<
      Record<string, { branchName: string; location: string; quantity: number }[]>
    >((acc, s) => {
      const pid = String(s.product);
      if (!acc[pid]) acc[pid] = [];
      acc[pid].push({
        branchName: s.branch?.name ?? 'Unknown',
        location: s.branch?.location ?? '',
        quantity: s.quantity,
      });
      return acc;
    }, {});

    const enrichedProducts = (products as any[]).map((p) => {
      const branches = stockByProduct[String(p._id)] ?? [];
      const totalStock = branches.reduce((sum: number, b: any) => sum + b.quantity, 0);
      return { _id: p._id, sku: p.sku, name: p.name, category: p.category, price: p.price, totalStock, branches };
    });

    const totalStock = enrichedProducts.reduce((sum, p) => sum + p.totalStock, 0);
    const outOfStock = enrichedProducts.filter((p) => p.totalStock === 0).length;

    return NextResponse.json({
      stats: {
        products: products.length,
        branches: branchCount,
        totalStock,
        outOfStock,
        pendingMovements: pendingCount,
        processedMovements: processedCount,
        failedMovements: failedCount,
      },
      products: enrichedProducts,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 });
  }
}
