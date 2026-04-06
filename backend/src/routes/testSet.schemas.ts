import { z } from 'zod';

const itemSchema = z.object({
  key: z.string().trim().min(1, 'Item key is required'),
  value: z.string().trim().min(1, 'Item value is required')
});

export const createTestSetSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Set name is required'),
    clusterTag: z.string().trim().min(1, 'Cluster tag is required'),
    items: z.array(itemSchema).min(1, 'At least one item is required')
  })
});

export const listTestSetSchema = z.object({
  query: z.object({
    clusterTag: z.string().trim().optional()
  })
});

export type CreateTestSetBody = z.infer<typeof createTestSetSchema>['body'];
export type ListTestSetQuery = z.infer<typeof listTestSetSchema>['query'];
