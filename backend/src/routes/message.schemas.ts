import { z } from 'zod';

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

const roomCodeSchema = z
  .string()
  .trim()
  .min(6, 'Room code is required')
  .max(16, 'Room code is too long')
  .transform((value) => value.toUpperCase());

const attachmentSchema = z.object({
  fileName: z.string().trim().min(1, 'Attachment file name is required').max(255, 'File name too long'),
  mimeType: z.string().trim().min(1, 'Attachment MIME type is required').max(200, 'MIME type too long'),
  dataBase64: z.string().trim().min(1, 'Attachment data is required')
});

const messageTypeSchema = z.enum(['text', 'gif', 'attachment', 'forward']);

export const sendMessageSchema = z.object({
  body: z
    .object({
      roomCode: roomCodeSchema,
      messageType: messageTypeSchema,
      text: z.string().trim().max(5000, 'Text is too long').optional(),
      gifUrl: z.string().trim().url('GIF URL must be a valid URL').max(2000, 'GIF URL is too long').optional(),
      attachment: attachmentSchema.optional(),
      forwardMessageId: z.string().trim().optional()
    })
    .superRefine((value, ctx) => {
      if (value.messageType === 'text' && !value.text) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['text'], message: 'Text is required' });
      }
      if (value.messageType === 'gif' && !value.gifUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gifUrl'], message: 'GIF URL is required' });
      }
      if (value.messageType === 'attachment' && !value.attachment) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['attachment'],
          message: 'Attachment is required'
        });
      }
      if (value.messageType === 'forward' && !value.forwardMessageId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['forwardMessageId'],
          message: 'Forward message id is required'
        });
      }

      if (value.messageType === 'attachment' && value.attachment) {
        const estimatedSizeBytes = Math.floor((value.attachment.dataBase64.length * 3) / 4);
        if (estimatedSizeBytes > MAX_ATTACHMENT_SIZE_BYTES) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['attachment', 'dataBase64'],
            message: 'Attachment exceeds 10MB limit'
          });
        }
      }
    })
});

export const listMessagesSchema = z.object({
  query: z.object({
    roomCode: roomCodeSchema,
    limit: z.coerce.number().int().min(1).max(100).default(50)
  })
});

export const reactMessageSchema = z.object({
  params: z.object({
    messageId: z.string().trim().min(1, 'Message id is required')
  }),
  body: z.object({
    roomCode: roomCodeSchema,
    emoji: z.string().trim().min(1, 'Emoji is required').max(16, 'Emoji is too long')
  })
});

export const forwardMessageSchema = z.object({
  params: z.object({
    messageId: z.string().trim().min(1, 'Message id is required')
  }),
  body: z.object({
    roomCode: roomCodeSchema
  })
});

export const markSeenSchema = z.object({
  params: z.object({
    messageId: z.string().trim().min(1, 'Message id is required')
  }),
  body: z.object({
    roomCode: roomCodeSchema
  })
});

export const downloadAttachmentSchema = z.object({
  params: z.object({
    messageId: z.string().trim().min(1, 'Message id is required')
  }),
  body: z.object({
    roomCode: roomCodeSchema
  })
});

export const deleteMessageSchema = z.object({
  params: z.object({
    messageId: z.string().trim().min(1, 'Message id is required')
  }),
  body: z.object({
    roomCode: roomCodeSchema
  })
});

export const deleteMessagesBulkSchema = z.object({
  body: z.object({
    roomCode: roomCodeSchema,
    messageIds: z
      .array(z.string().trim().min(1, 'Message id is required'))
      .min(1, 'Select at least one message')
      .max(100, 'Cannot delete more than 100 messages at once')
  })
});

export type SendMessageBody = z.infer<typeof sendMessageSchema>['body'];
export type ListMessagesQuery = z.infer<typeof listMessagesSchema>['query'];
export type ReactMessageBody = z.infer<typeof reactMessageSchema>['body'];
export type ForwardMessageBody = z.infer<typeof forwardMessageSchema>['body'];
export type MarkSeenBody = z.infer<typeof markSeenSchema>['body'];
export type DownloadAttachmentBody = z.infer<typeof downloadAttachmentSchema>['body'];
export type DeleteMessageBody = z.infer<typeof deleteMessageSchema>['body'];
export type DeleteMessagesBulkBody = z.infer<typeof deleteMessagesBulkSchema>['body'];
