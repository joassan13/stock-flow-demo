import dbConnect from '@/lib/mongodb';
import Movement from '@/lib/models/Movement';
import Stock from '@/lib/models/Stock';
import mongoose from 'mongoose';

export interface WorkerResult {
  processed: boolean;
  movementId?: string;
  error?: string;
}

/**
 * Picks one pending movement and applies basic stock changes.
 * Returns whether a movement was processed and what happened.
 *
 * Validation (checking sufficient stock) is added in the next commit.
 * Retry logic is added after that.
 */
export async function processNextMovement(): Promise<WorkerResult> {
  await dbConnect();

  // Atomically claim one pending movement by changing its status to avoid
  // double-processing if the worker is triggered concurrently.
  const movement = await Movement.findOneAndUpdate(
    { status: 'pending' },
    { $set: { status: 'processed' } },
    { new: false, sort: { createdAt: 1 } }
  );

  if (!movement) {
    return { processed: false };
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { type, product, fromBranch, toBranch, quantity } = movement;

      if (type === 'entry' || type === 'transfer') {
        // Add stock to destination branch
        await Stock.findOneAndUpdate(
          { product, branch: toBranch },
          { $inc: { quantity } },
          { upsert: true, new: true, session }
        );
      }

      if (type === 'exit' || type === 'transfer') {
        // Remove stock from origin branch
        await Stock.findOneAndUpdate(
          { product, branch: fromBranch },
          { $inc: { quantity: -quantity } },
          { session }
        );
      }
    });

    return { processed: true, movementId: String(movement._id) };
  } catch (err: any) {
    // Revert status back to pending so retry logic (Commit 9) can handle it
    await Movement.findByIdAndUpdate(movement._id, {
      $set: { status: 'pending' },
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
