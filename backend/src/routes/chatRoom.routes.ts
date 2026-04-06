import { Router } from 'express';
import { createChatRoom, joinChatRoom } from '../controllers/chatRoom.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { decryptAuthPayload } from '../middleware/decryptAuthPayload.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { createChatRoomSchema, joinChatRoomSchema } from './chatRoom.schemas.js';

const router = Router();

router.post('/', requireAuth, validateRequest(createChatRoomSchema), createChatRoom);
router.post('/join', requireAuth, decryptAuthPayload, validateRequest(joinChatRoomSchema), joinChatRoom);

export default router;
