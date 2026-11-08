import mongoose from 'mongoose';

// Run inside a MongoDB multi-document transaction when connected to a replica set,
// and gracefully fall back to standalone execution on single-node local MongoDB instances or disconnected unit tests.
export async function runTransaction(work) {
  let session = null;
  try {
    session = await mongoose.startSession();
  } catch {
    return await work(null);
  }
  try {
    return await session.withTransaction(() => work(session));
  } catch (error) {
    if (
      error.code === 20 ||
      /Transaction numbers are only allowed|Client must be connected/i.test(error.message)
    ) {
      return await work(null);
    }
    throw error;
  } finally {
    await session.endSession().catch(() => {});
  }
}

export function workflowError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}
