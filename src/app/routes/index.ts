import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { IdeaRoutes } from "../modules/idea/idea.route";
import { CategoryRoutes } from "../modules/category/category.route";

const router = Router();
router.use("/auth", AuthRoutes);
router.use("/ideas", IdeaRoutes);
router.use("/categories", CategoryRoutes);
export const IndexRoutes: Router = router;
