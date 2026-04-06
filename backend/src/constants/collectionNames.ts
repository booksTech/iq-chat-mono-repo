export const COLLECTION_NAMES = {
  USERS: 'users',
  CHAT_ROOMS: 'chat-rooms',
  MESSAGES: 'messages',
  ALPHA: 'alpha'
} as const;

export const DYNAMIC_COLLECTIONS: string[] = [
  COLLECTION_NAMES.USERS,
  COLLECTION_NAMES.CHAT_ROOMS,
  COLLECTION_NAMES.MESSAGES,
  COLLECTION_NAMES.ALPHA
];
