import dbConnect from '@/lib/mongodb';
import Movement from '@/lib/models/Movement';
import Stock from '@/lib/models/Stock';
import mongoose from 'mongoose';

export interface WorkerResult {
  processed: boolean;
  movementId?: string;
  error?: string;
}

const MAX_RETRIES = 2;

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
  if (type === 'exit' || type === 'transfer') {
    const originStock = await Stock.findOne({ product, branch: fromBranch });
    const available = originStock?.quantity ?? 0;

    if (available < quantity) {
      const failureReason = `Insufficient stock at origin branch: ${available} available, ${quantity} requested`;

      if (movement.retries < MAX_RETRIES) {
        // Still have retries left — put back to pending
        await Movement.findByIdAndUpdate(movement._id, {
          $set: { status: 'pending', failureReason },
          $inc: { retries: 1 },
        });
        return {
          processed: false,
          movementId: String(movement._id),
          error: `Insufficient stock (retry ${movement.retries + 1}/${MAX_RETRIES})`,
        };
      }

      // Exhausted retries — mark as permanently failed
      await Movement.findByIdAndUpdate(movement._id, {
        $set: { status: 'failed', failureReason },
        $inc: { retries: 1 },
      });
      return {
        processed: false,
        movementId: String(movement._id),
        error: 'Insufficient stock — max retries reached',
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

        if (!updated) {
          throw new Error(
            'Stock became insufficient between validation and update (concurrent movement)'
          );
        }
      }
    });

    return { processed: true, movementId: String(movement._id) };
  } catch (err: any) {
    const failureReason = err.message ?? 'Unknown error';

    if (movement.retries < MAX_RETRIES) {
      // Put back to pending for retry
      await Movement.findByIdAndUpdate(movement._id, {
        $set: { status: 'pending', failureReason },
        $inc: { retries: 1 },
      });
    } else {
      // Exhausted retries — mark as permanently failed
      await Movement.findByIdAndUpdate(movement._id, {
        $set: { status: 'failed', failureReason },
        $inc: { retries: 1 },
      });
    }

    return {
      processed: false,
      movementId: String(movement._id),
      error: failureReason,
    };
  } finally {
    await session.endSession();
  }
}
