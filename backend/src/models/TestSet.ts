import mongoose from 'mongoose';
import { COLLECTION_NAMES } from '../constants/collectionNames.js';

interface TestSetItem {
  key: string;
  value: string;
}

export interface TestSetDocument {
  name: string;
  clusterTag: string;
  items: TestSetItem[];
  createdAt: Date;
  updatedAt: Date;
}

const testSetItemSchema = new mongoose.Schema<TestSetItem>(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const testSetSchema = new mongoose.Schema<TestSetDocument>(
  {
    name: { type: String, required: true, trim: true },
    clusterTag: { type: String, required: true, trim: true, index: true },
    items: { type: [testSetItemSchema], default: [] }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

testSetSchema.index({ name: 1, clusterTag: 1 }, { unique: true });

export const TestSet = mongoose.model<TestSetDocument>('TestSet', testSetSchema, COLLECTION_NAMES.ALPHA);
