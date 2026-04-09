/**
 * @file share.controller.ts
 * @description HTTP request handlers for Share module
 * @version 1.0.0
 */

import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import * as ShareService from "./share.service";
import { ShareEntityType } from "../../../generated/prisma/enums";

// ==================== Share Tracking ====================

export const trackShare = catchAsync(async (req: Request, res: Response) => {
  const result = await ShareService.trackShare(
    req.user?.userId,
    req.ip,
    req.headers["user-agent"],
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Share tracked successfully",
    data: result,
  });
});

// ==================== Share Count ====================

export const getShareCount = catchAsync(async (req: Request, res: Response) => {
  const { entityType, entityId } = req.params;
  const result = await ShareService.getShareCount(
    entityType as ShareEntityType,
    entityId as string,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Share count fetched successfully",
    data: result,
  });
});

export const getBulkShareCounts = catchAsync(
  async (req: Request, res: Response) => {
    const { entityType } = req.params;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return sendResponse(res, {
        httpStatusCode: status.BAD_REQUEST,
        success: false,
        message: "ids array is required",
      });
    }

    const result = await ShareService.getBulkShareCounts(
      entityType as ShareEntityType,
      ids,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Bulk share counts fetched successfully",
      data: result,
    });
  },
);

// ==================== Open Graph Metadata ====================

export const getIdeaOGMetadata = catchAsync(
  async (req: Request, res: Response) => {
    const { slug } = req.params;
    const metadata = await ShareService.getIdeaOGMetadata(slug as string);

    if (!metadata) {
      return sendResponse(res, {
        httpStatusCode: status.NOT_FOUND,
        success: false,
        message: "Idea not found",
      });
    }

    // Render Open Graph meta tags HTML
    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:title" content="${escapeHtml(metadata.title)}" />
        <meta property="og:description" content="${escapeHtml(metadata.description)}" />
        <meta property="og:image" content="${metadata.image || ""}" />
        <meta property="og:url" content="${metadata.url}" />
        <meta property="og:type" content="${metadata.type}" />
        <meta property="og:site_name" content="${metadata.siteName}" />
        <meta property="article:author" content="${escapeHtml(metadata.author || "")}" />
        <meta property="article:published_time" content="${metadata.publishedTime || ""}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${escapeHtml(metadata.title)}" />
        <meta name="twitter:description" content="${escapeHtml(metadata.description)}" />
        <meta name="twitter:image" content="${metadata.image || ""}" />
        <title>${escapeHtml(metadata.title)} | EcoSpark Hub</title>
      </head>
      <body>
        <h1>${escapeHtml(metadata.title)}</h1>
        <p>${escapeHtml(metadata.description)}</p>
        <a href="${metadata.url}">View on EcoSpark Hub</a>
      </body>
    </html>
  `;

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  },
);

export const getBlogOGMetadata = catchAsync(
  async (req: Request, res: Response) => {
    const { slug } = req.params;
    const metadata = await ShareService.getBlogOGMetadata(slug as string);

    if (!metadata) {
      return sendResponse(res, {
        httpStatusCode: status.NOT_FOUND,
        success: false,
        message: "Blog not found",
      });
    }

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="og:title" content="${escapeHtml(metadata.title)}" />
        <meta property="og:description" content="${escapeHtml(metadata.description)}" />
        <meta property="og:image" content="${metadata.image || ""}" />
        <meta property="og:url" content="${metadata.url}" />
        <meta property="og:type" content="${metadata.type}" />
        <meta property="og:site_name" content="${metadata.siteName}" />
        <meta property="article:author" content="${escapeHtml(metadata.author || "")}" />
        <meta property="article:published_time" content="${metadata.publishedTime || ""}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${escapeHtml(metadata.title)}" />
        <meta name="twitter:description" content="${escapeHtml(metadata.description)}" />
        <meta name="twitter:image" content="${metadata.image || ""}" />
        <title>${escapeHtml(metadata.title)} | EcoSpark Hub Blog</title>
      </head>
      <body>
        <h1>${escapeHtml(metadata.title)}</h1>
        <p>${escapeHtml(metadata.description)}</p>
        <a href="${metadata.url}">Read more on EcoSpark Hub</a>
      </body>
    </html>
  `;

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  },
);

// Helper function to escape HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ==================== Share URLs ====================

export const getIdeaShareUrls = catchAsync(
  async (req: Request, res: Response) => {
    const { slug } = req.params;
    const urls = await ShareService.getIdeaShareUrls(slug as string);

    if (!urls) {
      return sendResponse(res, {
        httpStatusCode: status.NOT_FOUND,
        success: false,
        message: "Idea not found",
      });
    }

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Share URLs generated successfully",
      data: urls,
    });
  },
);

export const getBlogShareUrls = catchAsync(
  async (req: Request, res: Response) => {
    const { slug } = req.params;
    const urls = await ShareService.getBlogShareUrls(slug as string);

    if (!urls) {
      return sendResponse(res, {
        httpStatusCode: status.NOT_FOUND,
        success: false,
        message: "Blog not found",
      });
    }

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Share URLs generated successfully",
      data: urls,
    });
  },
);

// ==================== Share Analytics (Admin) ====================

export const getShareAnalytics = catchAsync(
  async (req: Request, res: Response) => {
    const { entityType, entityId } = req.params;
    const { startDate, endDate } = req.query;

    const result = await ShareService.getShareAnalytics(
      entityType as ShareEntityType,
      entityId as string,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined,
    );

    sendResponse(res, {
      httpStatusCode: status.OK,
      success: true,
      message: "Share analytics fetched successfully",
      data: result,
    });
  },
);
