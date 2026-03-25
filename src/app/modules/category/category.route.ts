import { Router } from "express";
import { CategoryController } from "./category.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import {
  createCategoryZodSchema,
  updateCategoryZodSchema,
} from "./category.validation";

const router = Router();

router.post(
  "/",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(createCategoryZodSchema),
  CategoryController.createCategory,
);

router.get("/", CategoryController.getAllCategories);

router.patch(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(updateCategoryZodSchema),
  CategoryController.updateCategory,
);

router.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN),
  CategoryController.deleteCategory,
);

export const CategoryRoutes: Router = router;
