/* eslint-disable @typescript-eslint/no-unused-vars */
import { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";
import { cloudinary } from "../../config/cloudinary.config";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import fs from "fs";
import path from "path";

interface UploadResult {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

interface MultipleUploadResult {
  success: UploadResult[];
  failed: { filename: string; error: string }[];
}

class UploadService {
  private static instance: UploadService;

  static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  async uploadSingleImage(
    file: Express.Multer.File,
    folder: string = "general",
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: `eco-spark/${folder}`,
        transformation: [
          { width: 1200, height: 800, crop: "limit", quality: "auto" },
        ],
        resource_type: "auto" as const,
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
          if (error || !result) {
            reject(
              new AppError(
                status.INTERNAL_SERVER_ERROR,
                `Upload failed: ${error?.message}`,
              ),
            );
          } else {
            resolve({
              secureUrl: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
            });
          }
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = "general",
  ): Promise<MultipleUploadResult> {
    const results: MultipleUploadResult = {
      success: [],
      failed: [],
    };

    const uploadPromises = files.map(async (file) => {
      try {
        const result = await this.uploadSingleImage(file, folder);
        results.success.push(result);
      } catch (error) {
        results.failed.push({
          filename: file.originalname,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    await Promise.all(uploadPromises);
    return results;
  }

  async deleteImage(publicId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(
            new AppError(
              status.INTERNAL_SERVER_ERROR,
              `Delete failed: ${error.message}`,
            ),
          );
        } else {
          resolve(result.result === "ok");
        }
      });
    });
  }

  async deleteMultipleImages(
    publicIds: string[],
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = { success: [] as string[], failed: [] as string[] };

    const deletePromises = publicIds.map(async (publicId) => {
      try {
        await this.deleteImage(publicId);
        results.success.push(publicId);
      } catch (error) {
        results.failed.push(publicId);
      }
    });

    await Promise.all(deletePromises);
    return results;
  }

  async updateImage(
    oldPublicId: string | null,
    newFile: Express.Multer.File,
    folder: string = "general",
  ): Promise<UploadResult> {
    if (oldPublicId) {
      await this.deleteImage(oldPublicId).catch(() => {});
    }
    return this.uploadSingleImage(newFile, folder);
  }
}

export const uploadService = UploadService.getInstance();
