/* eslint-disable @typescript-eslint/no-unused-vars */
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { cloudinary } from "../config/cloudinary.config";
import AppError from "../errorHelpers/AppError";
import status from "http-status";
import { Request } from "express";

// File filter for images only
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/jpg",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        status.BAD_REQUEST,
        "Only image files (JPEG, PNG, WEBP, GIF) are allowed",
      ),
    );
  }
};

// Cloudinary storage configuration
const createCloudinaryStorage = (folderName: string) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req: Request, file: Express.Multer.File) => {
      return {
        folder: `eco-spark/${folderName}`,
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation: [{ width: 1200, height: 800, crop: "limit" }],
        resource_type: "auto",
      };
    },
  });
};

// Multer configuration for idea images
const ideaImagesUpload = multer({
  storage: createCloudinaryStorage("ideas"),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10, // Max 10 images per idea
  },
});

// Multer configuration for single image (profile/avatar)
const singleImageUpload = multer({
  storage: createCloudinaryStorage("profiles"),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
});

// Multer configuration for multiple images with custom field name
const multipleImagesUpload = (fieldName: string, maxCount: number = 5) => {
  return multer({
    storage: createCloudinaryStorage("uploads"),
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: maxCount,
    },
  }).array(fieldName, maxCount);
};

export { ideaImagesUpload, singleImageUpload, multipleImagesUpload };
