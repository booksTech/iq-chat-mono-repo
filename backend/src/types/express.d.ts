export {};

declare global {
  namespace Express {
    interface Request {
      validated: any;
      authUserId?: string;
    }
  }
}
