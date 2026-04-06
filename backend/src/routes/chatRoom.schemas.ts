import { z } from 'zod';

const emailField = z.string().trim().email('Please provide a valid email').toLowerCase();

export const createChatRoomSchema = z.object({
  body: z
    .object({
      roomName: z.string().trim().min(2, 'Room name is required').max(80, 'Room name is too long'),
      emailOne: emailField,
      emailTwo: emailField
    })
    .superRefine((value, ctx) => {
      if (value.emailOne === value.emailTwo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['emailTwo'],
          message: 'Members must be two different emails'
        });
      }
    })
});

export const joinChatRoomSchema = z.object({
  body: z.object({
    roomCode: z
      .string()
      .trim()
      .min(6, 'Room code is required')
      .max(16, 'Room code is too long')
      .transform((value) => value.toUpperCase())
  })
});

export type CreateChatRoomBody = z.infer<typeof createChatRoomSchema>['body'];
export type JoinChatRoomBody = z.infer<typeof joinChatRoomSchema>['body'];
