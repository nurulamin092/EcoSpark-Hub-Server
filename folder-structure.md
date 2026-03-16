```md
# Backend Folder Structure
```

backend/
├── prisma/
│ ├── schema.prisma
│ ├── migrations/
│ └── seed.ts
│
├── src/
│ ├── app/
│ │ ├── modules/
│ │ │ ├── auth/
│ │ │ │ ├── auth.controller.ts
│ │ │ │ ├── auth.service.ts
│ │ │ │ ├── auth.repository.ts
│ │ │ │ ├── auth.validation.ts
│ │ │ │ ├── auth.interface.ts
│ │ │ │ ├── auth.constant.ts
│ │ │ │ ├── auth.utils.ts
│ │ │ │ └── auth.route.ts
│ │ │ │
│ │ │ ├── user/
│ │ │ │ ├── user.controller.ts
│ │ │ │ ├── user.service.ts
│ │ │ │ ├── user.repository.ts
│ │ │ │ ├── user.validation.ts
│ │ │ │ ├── user.interface.ts
│ │ │ │ ├── user.constant.ts
│ │ │ │ └── user.route.ts
│ │ │ │
│ │ │ ├── idea/
│ │ │ │ ├── idea.controller.ts
│ │ │ │ ├── idea.service.ts
│ │ │ │ ├── idea.repository.ts
│ │ │ │ ├── idea.validation.ts
│ │ │ │ ├── idea.interface.ts
│ │ │ │ ├── idea.constant.ts
│ │ │ │ └── idea.route.ts
│ │ │ │
│ │ │ ├── category/
│ │ │ │ ├── category.controller.ts
│ │ │ │ ├── category.service.ts
│ │ │ │ ├── category.repository.ts
│ │ │ │ ├── category.validation.ts
│ │ │ │ ├── category.interface.ts
│ │ │ │ └── category.route.ts
│ │ │ │
│ │ │ ├── vote/
│ │ │ │ ├── vote.controller.ts
│ │ │ │ ├── vote.service.ts
│ │ │ │ ├── vote.repository.ts
│ │ │ │ ├── vote.interface.ts
│ │ │ │ └── vote.route.ts
│ │ │ │
│ │ │ ├── comment/
│ │ │ │ ├── comment.controller.ts
│ │ │ │ ├── comment.service.ts
│ │ │ │ ├── comment.repository.ts
│ │ │ │ ├── comment.validation.ts
│ │ │ │ ├── comment.interface.ts
│ │ │ │ └── comment.route.ts
│ │ │ │
│ │ │ ├── payment/
│ │ │ │ ├── payment.controller.ts
│ │ │ │ ├── payment.service.ts
│ │ │ │ ├── payment.repository.ts
│ │ │ │ ├── payment.validation.ts
│ │ │ │ ├── payment.interface.ts
│ │ │ │ ├── payment.utils.ts
│ │ │ │ └── payment.route.ts
│ │ │ │
│ │ │ └── admin/
│ │ │ ├── admin.controller.ts
│ │ │ ├── admin.service.ts
│ │ │ ├── admin.repository.ts
│ │ │ ├── admin.validation.ts
│ │ │ ├── admin.interface.ts
│ │ │ └── admin.route.ts
│ │ │
│ │ ├── middleware/
│ │ │ ├── auth.middleware.ts
│ │ │ ├── role.middleware.ts
│ │ │ ├── validate.middleware.ts
│ │ │ ├── rateLimit.middleware.ts
│ │ │ ├── error.middleware.ts
│ │ │ ├── notFound.middleware.ts
│ │ │ └── fileUpload.middleware.ts
│ │ │
│ │ ├── config/
│ │ │ ├── env.config.ts
│ │ │ ├── database.config.ts
│ │ │ ├── redis.config.ts
│ │ │ └── payment.config.ts
│ │ │
│ │ ├── utils/
│ │ │ ├── jwt.utils.ts
│ │ │ ├── token.utils.ts
│ │ │ ├── email.utils.ts
│ │ │ ├── pagination.utils.ts
│ │ │ ├── slug.utils.ts
│ │ │ ├── file.utils.ts
│ │ │ └── apiResponse.utils.ts
│ │ │
│ │ ├── lib/
│ │ │ ├── prisma.lib.ts
│ │ │ ├── redis.lib.ts
│ │ │ ├── email.lib.ts
│ │ │ └── payment.lib.ts
│ │ │
│ │ ├── errors/
│ │ │ ├── ApiError.ts
│ │ │ ├── errorCodes.ts
│ │ │ └── prismaError.handler.ts
│ │ │
│ │ ├── types/
│ │ │ ├── express.d.ts
│ │ │ ├── user.types.ts
│ │ │ └── idea.types.ts
│ │ │
│ │ ├── constants/
│ │ │ ├── roles.ts
│ │ │ ├── ideaStatus.ts
│ │ │ ├── categories.ts
│ │ │ └── httpStatus.ts
│ │ │
│ │ └── routes/
│ │ └── index.ts
│ │
│ ├── app.ts
│ └── server.ts
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md

```

```
