import { Router } from "express";
import { AuthController } from "./auth.controller";

const router = Router();
router.post("/register", AuthController.registerMember);
router.post("/login", AuthController.loginUser);
export const AuthRoutes: Router = router;
