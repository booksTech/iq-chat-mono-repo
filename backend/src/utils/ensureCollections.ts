import mongoose from 'mongoose';
import { DYNAMIC_COLLECTIONS } from '../constants/collectionNames.js';

function isNamespaceExistsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { code?: number; codeName?: string; message?: string };
  return (
    err.code === 48 ||
    err.codeName === 'NamespaceExists' ||
    Boolean(err.message?.toLowerCase().includes('already exists'))
  );
}

export async function ensureCollections(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    return;
  }

  for (const collectionName of DYNAMIC_COLLECTIONS) {
    try {
      await db.createCollection(collectionName);
    } catch (error) {
      if (!isNamespaceExistsError(error)) {
        throw error;
      }
    }
  }
}
