import { Router } from "express";
import { UploadController } from "./upload.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import {
  ideaImagesUpload,
  singleImageUpload,
} from "../../middleware/upload.middleware";
import { writeRateLimiter } from "../../middleware/rateLimiter";

const router = Router();

// Upload multiple images for an idea
router.post(
  "/ideas/images",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  ideaImagesUpload,
  UploadController.uploadIdeaImages,
);

// Delete a specific image from an idea
router.delete(
  "/ideas/:ideaId/images/:publicId",
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  UploadController.deleteIdeaImage,
);

// Upload profile image
router.post(
  "/profile/image",
  writeRateLimiter,
  checkAuth(Role.MEMBER, Role.ADMIN, Role.SUPER_ADMIN),
  singleImageUpload,
  UploadController.uploadProfileImage,
);

export const UploadRoutes = router;
