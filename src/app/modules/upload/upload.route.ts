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
  (req, res, next) => {
    ideaImagesUpload.array("images", 10)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
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

  (req, res, next) => {
    singleImageUpload.single("image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  UploadController.uploadProfileImage,
);

export const UploadRoutes = router;
