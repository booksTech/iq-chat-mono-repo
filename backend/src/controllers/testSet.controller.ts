import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP } from '../utils/httpStatus.js';
import { TestSet } from '../models/TestSet.js';
import type { CreateTestSetBody, ListTestSetQuery } from '../routes/testSet.schemas.js';

export const createTestSet = asyncHandler(async (req, res) => {
  const { name, clusterTag, items } = req.validated.body as CreateTestSetBody;

  const testSet = await TestSet.create({
    name,
    clusterTag,
    items
  });

  return res.status(HTTP.CREATED).json({
    success: true,
    message: 'Test set created successfully',
    data: {
      id: testSet._id.toString(),
      name: testSet.name,
      clusterTag: testSet.clusterTag,
      items: testSet.items,
      createdAt: testSet.createdAt
    }
  });
});

export const listTestSets = asyncHandler(async (req, res) => {
  const { clusterTag } = req.validated.query as ListTestSetQuery;

  const filter = clusterTag ? { clusterTag } : {};
  const sets = await TestSet.find(filter).sort({ createdAt: -1 });

  return res.status(HTTP.OK).json({
    success: true,
    message: 'Test sets fetched successfully',
    data: {
      count: sets.length,
      sets
    }
  });
});
