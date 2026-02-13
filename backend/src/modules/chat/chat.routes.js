import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as validators from './chat.validators.js';
import * as ctrl from './chat.controllers.js';

const router = Router();

router.use(requireAuth);

router.get('/chats', ctrl.listChats);
router.post('/chats',
    validate(validators.createChatSchema),
    ctrl.createChat
);
router.get('/chats/:chatId',
    validate(validators.chatIdParamSchema, 'params'),
    ctrl.getChat
);
router.delete('/chats/:chatId',
    validate(validators.chatIdParamSchema, 'params'),
    ctrl.deleteChatById
);
router.post('/chats/:chatId/messages',
    validate(validators.chatIdParamSchema, 'params'),
    validate(validators.sendMessageSchema),
    ctrl.sendMessage
);

export default router;
