import { Router } from "express";
import { VoteController } from "./vote.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { voteZodSchema } from "./vote.validation";
import { writeRateLimiter } from "../../middleware/rateLimiter";

const router = Router();

router.post(
  "/",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  validateRequest(voteZodSchema),
  VoteController.voteIdea,
);

router.get(
  "/me/all",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  VoteController.getMyVotes,
);

router.get(
  "/:ideaId",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  VoteController.getUserVote,
);

router.delete(
  "/:ideaId",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  VoteController.removeVote,
);

export const VoteRoutes: Router = router;
