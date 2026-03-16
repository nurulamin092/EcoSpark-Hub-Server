# Backend Folder Structure

```bash
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── src/
│   ├── app/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.repository.ts
│   │   │   │   ├── auth.validation.ts
│   │   │   │   ├── auth.interface.ts
│   │   │   │   ├── auth.constant.ts
│   │   │   │   ├── auth.utils.ts
│   │   │   │   └── auth.route.ts
│   │   │   │
│   │   │   ├── user/
│   │   │   ├── idea/
│   │   │   ├── category/
│   │   │   ├── vote/
│   │   │   ├── comment/
│   │   │   ├── payment/
│   │   │   └── admin/
│   │   │
│   │   ├── middleware/
│   │   ├── config/
│   │   ├── utils/
│   │   ├── lib/
│   │   ├── errors/
│   │   ├── types/
│   │   ├── constants/
│   │   └── routes/
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```
