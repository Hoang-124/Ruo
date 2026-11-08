import mongoose from 'mongoose';

// Run inside a MongoDB multi-document transaction when connected to a replica set,
// and gracefully fall back to standalone execution on single-node local MongoDB instances.
export async function runTransaction(work) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => work(session));
  } catch (error) {
    if (error.code === 20 || /Transaction numbers are only allowed/.test(error.message)) {
      return await work(null);
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export function workflowError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}
