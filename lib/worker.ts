import dbConnect from '@/lib/mongodb';
import Movement from '@/lib/models/Movement';
import Stock from '@/lib/models/Stock';
import mongoose from 'mongoose';

export interface WorkerResult {
  processed: boolean;
  movementId?: string;
  error?: string;
}

export async function processNextMovement(): Promise<WorkerResult> {
  await dbConnect();

  // Atomically claim one pending movement to avoid double-processing under concurrency.
  const movement = await Movement.findOneAndUpdate(
    { status: 'pending' },
    { $set: { status: 'processed' } },
    { new: false, sort: { createdAt: 1 } }
  );

  if (!movement) {
    return { processed: false };
  }

  const { type, product, fromBranch, toBranch, quantity } = movement;

  // --- Stock validation ---
  // For exit and transfer, check that the origin branch has enough stock
  // BEFORE touching any document. If not, mark as failed immediately.
  if (type === 'exit' || type === 'transfer') {
    const originStock = await Stock.findOne({ product, branch: fromBranch });
    const available = originStock?.quantity ?? 0;

    if (available < quantity) {
      await Movement.findByIdAndUpdate(movement._id, {
        $set: {
          status: 'failed',
          failureReason: `Insufficient stock at origin branch: ${available} available, ${quantity} requested`,
        },
      });

      return {
        processed: false,
        movementId: String(movement._id),
        error: 'Insufficient stock',
      };
    }
  }

  // --- Apply stock changes inside a transaction ---
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      if (type === 'entry' || type === 'transfer') {
        await Stock.findOneAndUpdate(
          { product, branch: toBranch },
          { $inc: { quantity } },
          { upsert: true, new: true, session }
        );
      }

      if (type === 'exit' || type === 'transfer') {
        const updated = await Stock.findOneAndUpdate(
          { product, branch: fromBranch, quantity: { $gte: quantity } },
          { $inc: { quantity: -quantity } },
          { new: true, session }
        );

        // Guard against a race condition: another process may have consumed
        // the stock between the validation check above and this update.
        if (!updated) {
          throw new Error(
            'Stock became insufficient between validation and update (concurrent movement)'
          );
        }
      }
    });

    return { processed: true, movementId: String(movement._id) };
  } catch (err: any) {
    // Revert to pending so retry logic (Commit 9) can handle it
    await Movement.findByIdAndUpdate(movement._id, {
      $set: { status: 'pending' },
      $inc: { retries: 1 },
    });

    return {
      processed: false,
      movementId: String(movement._id),
      error: err.message ?? 'Unknown error',
    };
  } finally {
    await session.endSession();
  }
}
