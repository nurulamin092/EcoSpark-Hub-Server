```bash
mkdir -p src/app/{modules/{auth,user,idea,category,vote,comment,payment,admin},middleware,config,utils,lib,errors,types,constants,routes} && \
touch src/app/modules/auth/{auth.controller.ts,auth.service.ts,auth.repository.ts,auth.validation.ts,auth.interface.ts,auth.constant.ts,auth.utils.ts,auth.route.ts} && \
touch src/app/modules/user/{user.controller.ts,user.service.ts,user.repository.ts,user.validation.ts,user.interface.ts,user.constant.ts,user.route.ts} && \
touch src/app/modules/idea/{idea.controller.ts,idea.service.ts,idea.repository.ts,idea.validation.ts,idea.interface.ts,idea.constant.ts,idea.route.ts} && \
touch src/app/modules/category/{category.controller.ts,category.service.ts,category.repository.ts,category.validation.ts,category.interface.ts,category.route.ts} && \
touch src/app/modules/vote/{vote.controller.ts,vote.service.ts,vote.repository.ts,vote.interface.ts,vote.route.ts} && \
touch src/app/modules/comment/{comment.controller.ts,comment.service.ts,comment.repository.ts,comment.validation.ts,comment.interface.ts,comment.route.ts} && \
touch src/app/modules/payment/{payment.controller.ts,payment.service.ts,payment.repository.ts,payment.validation.ts,payment.interface.ts,payment.utils.ts,payment.route.ts} && \
touch src/app/modules/admin/{admin.controller.ts,admin.service.ts,admin.repository.ts,admin.validation.ts,admin.interface.ts,admin.route.ts} && \
touch src/app/middleware/{auth.middleware.ts,role.middleware.ts,validate.middleware.ts,rateLimit.middleware.ts,error.middleware.ts,notFound.middleware.ts,fileUpload.middleware.ts} && \
touch src/app/config/{env.config.ts,database.config.ts,redis.config.ts,payment.config.ts} && \
touch src/app/utils/{jwt.utils.ts,token.utils.ts,email.utils.ts,pagination.utils.ts,slug.utils.ts,file.utils.ts,apiResponse.utils.ts} && \
touch src/app/lib/{prisma.lib.ts,redis.lib.ts,email.lib.ts,payment.lib.ts} && \
touch src/app/errors/{ApiError.ts,errorCodes.ts,prismaError.handler.ts} && \
touch src/app/types/{express.d.ts,user.types.ts,idea.types.ts} && \
touch src/app/constants/{roles.ts,ideaStatus.ts,categories.ts,httpStatus.ts} && \
touch src/app/routes/index.ts
```
