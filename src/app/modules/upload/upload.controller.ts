import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { uploadService } from "./upload.service";
import status from "http-status";
import { prisma } from "../../lib/prisma";
import { Role } from "../../../generated/prisma/enums";

const uploadIdeaImages = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const { ideaId } = req.body;

  if (!files || files.length === 0) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "No files uploaded",
    });
  }

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { authorId: true, images: true },
  });

  if (!idea) {
    return sendResponse(res, {
      httpStatusCode: status.NOT_FOUND,
      success: false,
      message: "Idea not found",
    });
  }

  // Check permission
  if (
    idea.authorId !== req.user.userId &&
    req.user.role !== Role.ADMIN &&
    req.user.role !== Role.SUPER_ADMIN
  ) {
    return sendResponse(res, {
      httpStatusCode: status.FORBIDDEN,
      success: false,
      message: "Not authorized to upload images for this idea",
    });
  }

  const result = await uploadService.uploadMultipleImages(
    files,
    `ideas/${ideaId}`,
  );

  // Get existing images
  const existingImages = (idea.images as any[]) || [];
  const newImages = result.success.map((img) => ({
    secureUrl: img.secureUrl,
    publicId: img.publicId,
    width: img.width,
    height: img.height,
    format: img.format,
    size: img.bytes,
    uploadedAt: new Date(),
  }));

  // Update idea with new images
  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      images: [...existingImages, ...newImages],
    },
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `${result.success.length} images uploaded successfully`,
    data: {
      uploaded: result.success,
      failed: result.failed,
      totalImages: existingImages.length + result.success.length,
    },
  });
});

const deleteIdeaImage = catchAsync(async (req: Request, res: Response) => {
  const { ideaId, publicId } = req.params;

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    select: { authorId: true, images: true },
  });

  if (!idea) {
    return sendResponse(res, {
      httpStatusCode: status.NOT_FOUND,
      success: false,
      message: "Idea not found",
    });
  }

  // Check permission
  if (
    idea.authorId !== req.user.userId &&
    req.user.role !== Role.ADMIN &&
    req.user.role !== Role.SUPER_ADMIN
  ) {
    return sendResponse(res, {
      httpStatusCode: status.FORBIDDEN,
      success: false,
      message: "Not authorized",
    });
  }

  const images = (idea.images as any[]) || [];
  const imageToDelete = images.find((img) => img.publicId === publicId);

  if (!imageToDelete) {
    return sendResponse(res, {
      httpStatusCode: status.NOT_FOUND,
      success: false,
      message: "Image not found",
    });
  }

  // Delete from Cloudinary
  await uploadService.deleteImage(publicId);

  // Remove from database
  const updatedImages = images.filter((img) => img.publicId !== publicId);

  await prisma.idea.update({
    where: { id: ideaId },
    data: { images: updatedImages },
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Image deleted successfully",
  });
});

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
  const file = req.file as Express.Multer.File;

  if (!file) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "No file uploaded",
    });
  }

  const userId = req.user.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { member: true, admin: true },
  });

  if (!user) {
    return sendResponse(res, {
      httpStatusCode: status.NOT_FOUND,
      success: false,
      message: "User not found",
    });
  }

  // Delete old image if exists
  const oldImagePublicId = user.image
    ? user.image.split("/").pop()?.split(".")[0]
    : null;
  if (oldImagePublicId) {
    await uploadService
      .deleteImage(`eco-spark/profiles/${oldImagePublicId}`)
      .catch(() => {});
  }

  const result = await uploadService.uploadSingleImage(file, "profiles");

  // Update user image
  await prisma.user.update({
    where: { id: userId },
    data: { image: result.secureUrl },
  });

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile image updated successfully",
    data: { secureUrl: result.secureUrl },
  });
});

export const UploadController = {
  uploadIdeaImages,
  deleteIdeaImage,
  uploadProfileImage,
};
