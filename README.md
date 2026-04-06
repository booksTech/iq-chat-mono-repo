# Quizz Chat

## Folder Structure

```text
quizz_chat/
├─ backend/
│  └─ src/
│     ├─ app.ts
│     ├─ server.ts
│     ├─ config/
│     │  ├─ db.ts
│     │  └─ env.ts
│     ├─ constants/
│     │  └─ collectionNames.ts
│     ├─ controllers/
│     │  ├─ auth.controller.ts
│     │  ├─ chatRoom.controller.ts
│     │  ├─ message.controller.ts
│     │  └─ testSet.controller.ts
│     ├─ middleware/
│     │  ├─ auth.ts
│     │  ├─ decryptAuthPayload.ts
│     │  ├─ errorHandler.ts
│     │  └─ validateRequest.ts
│     ├─ models/
│     │  ├─ ChatRoom.ts
│     │  ├─ Message.ts
│     │  ├─ TestSet.ts
│     │  └─ User.ts
│     ├─ routes/
│     │  ├─ auth.routes.ts
│     │  ├─ auth.schemas.ts
│     │  ├─ chatRoom.routes.ts
│     │  ├─ chatRoom.schemas.ts
│     │  ├─ message.routes.ts
│     │  ├─ message.schemas.ts
│     │  ├─ testSet.routes.ts
│     │  └─ testSet.schemas.ts
│     ├─ socket/
│     │  └─ index.ts
│     ├─ types/
│     │  └─ express.d.ts
│     └─ utils/
│        ├─ AppError.ts
│        ├─ asyncHandler.ts
│        ├─ ensureCollections.ts
│        ├─ httpStatus.ts
│        ├─ messageCrypto.ts
│        ├─ payloadCrypto.ts
│        ├─ sendEmail.ts
│        └─ token.ts
├─ public/
├─ src/
│  ├─ .env
│  ├─ .env.example
│  ├─ App.tsx
│  ├─ app.css
│  ├─ index.css
│  ├─ main.tsx
│  ├─ vite-env.d.ts
│  ├─ assets/
│  │  ├─ hero.png
│  │  ├─ react.svg
│  │  └─ vite.svg
│  ├─ components/
│  │  ├─ AuthScreen.tsx
│  │  ├─ CreateRoomScreen.tsx
│  │  ├─ LockScreen.tsx
│  │  ├─ PortalChatScreen.tsx
│  │  ├─ QuizScreen.tsx
│  │  └─ ResultScreen.tsx
│  ├─ constants/
│  │  └─ quizData.ts
│  ├─ services/
│  │  ├─ authApi.ts
│  │  ├─ chatRoomApi.ts
│  │  ├─ messageApi.ts
│  │  └─ socketClient.ts
│  └─ types/
│     └─ quiz.ts
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.js
└─ NETLIFY_DEPLOYMENT.md
```
