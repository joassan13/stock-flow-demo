import dbConnect from '@/lib/mongodb';
import Movement from '@/lib/models/Movement';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = request.nextUrl;
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // Parse date-only strings (YYYY-MM-DD) as local midnight to avoid UTC offset shifting the day
    function parseLocalDate(str: string): Date {
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d);
    }

    // Default: last 30 days
    const from = fromParam ? parseLocalDate(fromParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = toParam ? parseLocalDate(toParam) : new Date();

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    const matchFilter = { createdAt: { $gte: from, $lte: to } };

    const [total, byType, byFromBranch, byToBranch] = await Promise.all([
      Movement.countDocuments(matchFilter),

      // Group by movement type
      Movement.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // Group by origin branch
      Movement.aggregate([
        { $match: { ...matchFilter, fromBranch: { $exists: true, $ne: null } } },
        { $group: { _id: '$fromBranch', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'branches',
            localField: '_id',
            foreignField: '_id',
            as: 'branch',
          },
        },
        { $unwind: '$branch' },
        { $project: { _id: 1, branchName: '$branch.name', count: 1 } },
      ]),

      // Group by destination branch
      Movement.aggregate([
        { $match: { ...matchFilter, toBranch: { $exists: true, $ne: null } } },
        { $group: { _id: '$toBranch', count: { $sum: 1 } } },
        {
          $lookup: {
            from: 'branches',
            localField: '_id',
            foreignField: '_id',
            as: 'branch',
          },
        },
        { $unwind: '$branch' },
        { $project: { _id: 1, branchName: '$branch.name', count: 1 } },
      ]),
    ]);

    // Merge origin + destination counts per branch
    const branchMap = new Map<string, { branchName: string; asOrigin: number; asDestination: number }>();

    for (const entry of byFromBranch as any[]) {
      branchMap.set(String(entry._id), {
        branchName: entry.branchName,
        asOrigin: entry.count,
        asDestination: 0,
      });
    }
    for (const entry of byToBranch as any[]) {
      const key = String(entry._id);
      const existing = branchMap.get(key);
      if (existing) {
        existing.asDestination = entry.count;
      } else {
        branchMap.set(key, { branchName: entry.branchName, asOrigin: 0, asDestination: entry.count });
      }
    }

    const byBranch = Array.from(branchMap.values())
      .map((b) => ({ ...b, total: b.asOrigin + b.asDestination }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      dateRange: { from: from.toISOString(), to: to.toISOString() },
      total,
      byType: (byType as any[]).map((t) => ({ type: t._id, count: t.count })),
      byBranch,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
