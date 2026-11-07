import mongoose from 'mongoose';

// Multi-document workflows must fail closed on standalone MongoDB, never partially commit.
export async function runTransaction(work) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => work(session));
  } catch (error) {
    if (error.code === 20 || /Transaction numbers are only allowed/.test(error.message)) {
      throw Object.assign(new Error('Thao tác này cần MongoDB replica set để bảo đảm toàn vẹn dữ liệu.'), { statusCode: 503 });
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

export function workflowError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}
