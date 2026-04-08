# Backend Folder Structure

```bash
eco-spark-hub-server/
│
├── src/
│   ├── app.ts
│   ├── server.ts
│   │
│   └── app/
│       │
│       ├── config/
│       │   ├── env.ts
│       │   ├── stripe.config.ts
│       │   └── cloudinary.config.ts
│       │
│       ├── errorHelpers/
│       │   ├── AppError.ts
│       │   └── handleZodError.ts
│       │
│       ├── interface/
│       │   ├── error.interface.ts
│       │   ├── index.ts
│       │   └── requestUser.interface.ts
│       │
│       ├── lib/
│       │   ├── auth.ts
│       │   └── prisma.ts
│       │
│       ├── middleware/
│       │   ├── audit.middleware.ts
│       │   ├── checkAuth.ts
│       │   ├── checkPaymentAccess.ts
│       │   ├── globalErrorHandler.ts
│       │   ├── notFound.ts
│       │   ├── rateLimiter.ts
│       │   ├── upload.middleware.ts
│       │   └── validateRequest.ts
│       │
│       ├── modules/
│       │   │
│       │   ├── activity/
│       │   │   ├── activity.controller.ts
│       │   │   ├── activity.route.ts
│       │   │   └── activity.service.ts
│       │   │
│       │   ├── admin/
│       │   │   ├── admin.controller.ts
│       │   │   ├── admin.interface.ts
│       │   │   ├── admin.route.ts
│       │   │   ├── admin.service.ts
│       │   │   └── admin.validation.ts
│       │   │
│       │   ├── auditLog/
│       │   │   ├── auditLog.controller.ts
│       │   │   ├── auditLog.interface.ts
│       │   │   ├── auditLog.route.ts
│       │   │   └── auditLog.service.ts
│       │   │
│       │   ├── auth/
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.interface.ts
│       │   │   ├── auth.route.ts
│       │   │   ├── auth.service.ts
│       │   │   └── tokenBlacklist.service.ts
│       │   │
│       │   ├── bookmark/
│       │   │   ├── bookmark.controller.ts
│       │   │   ├── bookmark.route.ts
│       │   │   └── bookmark.service.ts
│       │   │
│       │   ├── category/
│       │   │   ├── category.controller.ts
│       │   │   ├── category.route.ts
│       │   │   ├── category.service.ts
│       │   │   └── category.validation.ts
│       │   │
│       │   ├── comment/
│       │   │   ├── comment.controller.ts
│       │   │   ├── comment.interface.ts
│       │   │   ├── comment.route.ts
│       │   │   ├── comment.service.ts
│       │   │   └── comment.validation.ts
│       │   │
│       │   ├── health/
│       │   │   ├── health.controller.ts
│       │   │   └── health.route.ts
│       │   │
│       │   ├── idea/
│       │   │   ├── idea.controller.ts
│       │   │   ├── idea.interface.ts
│       │   │   ├── idea.route.ts
│       │   │   ├── idea.service.ts
│       │   │   └── idea.validation.ts
│       │   │
│       │   ├── newsletter/
│       │   │   ├── newsletter.controller.ts
│       │   │   ├── newsletter.route.ts
│       │   │   ├── newsletter.service.ts
│       │   │   └── newsletter.validation.ts
│       │   │
│       │   ├── notification/
│       │   │   ├── notification.controller.ts
│       │   │   ├── notification.route.ts
│       │   │   └── notification.service.ts
│       │   │
│       │   ├── payment/
│       │   │   ├── payment.controller.ts
│       │   │   ├── payment.interface.ts
│       │   │   ├── payment.route.ts
│       │   │   ├── payment.service.ts
│       │   │   └── payment.validation.ts
│       │   │
│       │   ├── report/
│       │   │   ├── report.controller.ts
│       │   │   ├── report.interface.ts
│       │   │   ├── report.route.ts
│       │   │   ├── report.service.ts
│       │   │   └── report.validation.ts
│       │   │
│       │   ├── setting/
│       │   │   ├── setting.controller.ts
│       │   │   ├── setting.interface.ts
│       │   │   ├── setting.route.ts
│       │   │   ├── setting.service.ts
│       │   │   └── setting.validation.ts
│       │   │
│       │   ├── upload/
│       │   │   ├── upload.controller.ts
│       │   │   ├── upload.route.ts
│       │   │   └── upload.service.ts
│       │   │
│       │   └── vote/
│       │       ├── vote.controller.ts
│       │       ├── vote.interface.ts
│       │       ├── vote.route.ts
│       │       ├── vote.service.ts
│       │       └── vote.validation.ts
│       │
│       ├── routes/
│       │   └── index.ts
│       │
│       ├── shared/
│       │   ├── catchAsync.ts
│       │   └── sendResponse.ts
│       │
│       ├── templates/
│       │   ├── googleRedirect.ejs
│       │   └── otp.ejs
│       │
│       └── utils/
│           ├── auditLogger.ts
│           ├── cookie.ts
│           ├── email.ts
│           ├── jwt.ts
│           ├── paginationHelper.ts
│           └── token.ts
│
├── prisma/
│   ├── schema/
│   │   ├── activity.prisma
│   │   ├── auditLog.prisma
│   │   ├── auth.prisma
│   │   ├── bookmark.prisma
│   │   ├── category.prisma
│   │   ├── comment.prisma
│   │   ├── idea.prisma
│   │   ├── newsletter.prisma
│   │   ├── notification.prisma
│   │   ├── payment.prisma
│   │   ├── report.prisma
│   │   ├── setting.prisma
│   │   └── vote.prisma
│   │
│   ├── migrations/
│   │   └── (all migration files)
│   │
│   └── schema.prisma (main entry point)
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── README.md
```
