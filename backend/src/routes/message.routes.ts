import { Router } from 'express';
import {
  deleteMessage,
  deleteMessagesBulk,
  downloadAttachment,
  forwardMessage,
  listMessages,
  markMessageSeen,
  reactToMessage,
  sendMessage
} from '../controllers/message.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
  deleteMessageSchema,
  deleteMessagesBulkSchema,
  downloadAttachmentSchema,
  forwardMessageSchema,
  listMessagesSchema,
  markSeenSchema,
  reactMessageSchema,
  sendMessageSchema
} from './message.schemas.js';

const router = Router();

router.get('/', requireAuth, validateRequest(listMessagesSchema), listMessages);
router.post('/send', requireAuth, validateRequest(sendMessageSchema), sendMessage);
router.post('/:messageId/reactions', requireAuth, validateRequest(reactMessageSchema), reactToMessage);
router.post('/:messageId/seen', requireAuth, validateRequest(markSeenSchema), markMessageSeen);
router.post('/:messageId/forward', requireAuth, validateRequest(forwardMessageSchema), forwardMessage);
router.delete('/:messageId', requireAuth, validateRequest(deleteMessageSchema), deleteMessage);
router.delete('/bulk', requireAuth, validateRequest(deleteMessagesBulkSchema), deleteMessagesBulk);
router.post(
  '/:messageId/attachments/download',
  requireAuth,
  validateRequest(downloadAttachmentSchema),
  downloadAttachment
);

export default router;
