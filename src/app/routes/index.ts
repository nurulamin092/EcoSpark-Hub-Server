import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { IdeaRoutes } from "../modules/idea/idea.route";

const router = Router();
router.use("/auth", AuthRoutes);
router.use("/ideas", IdeaRoutes);
export const IndexRoutes: Router = router;
