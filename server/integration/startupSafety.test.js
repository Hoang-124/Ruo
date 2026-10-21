import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';

test('normal startup preserves legacy users/audit records and never creates demo accounts', async () => {
  const database = `ruo_task_test_${randomUUID().replaceAll('-', '')}`;
  const uri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27028';
  const previousUri = process.env.MONGO_URI;
  try {
    await mongoose.connect(uri, { dbName: database, serverSelectionTimeoutMS: 5000 });
    const user = { _id: new mongoose.Types.ObjectId(), employeeCode: 'LEGACY-1', fullName: 'Existing account', role: 'student' };
    const audit = { _id: new mongoose.Types.ObjectId(), action: 'LEGACY_EVENT', seq: 1 };
    await mongoose.connection.collection('users').insertOne(user);
    await mongoose.connection.collection('auditlogs').insertOne(audit);
    await mongoose.disconnect();
    const connectionUrl = new URL(uri);
    connectionUrl.pathname = `/${database}`;
    process.env.MONGO_URI = connectionUrl.toString();
    await connectDB();
    assert.deepEqual(await mongoose.connection.collection('users').find({}).toArray(), [user]);
    assert.deepEqual(await mongoose.connection.collection('auditlogs').find({}).toArray(), [audit]);
  } finally {
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === database) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    if (previousUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousUri;
  }
});
