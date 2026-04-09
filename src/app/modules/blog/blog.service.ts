/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @file blog.service.ts
 * @description Service layer for Blog module
 * @version 1.0.0
 */

import { prisma } from "../../lib/prisma";
import {
  ICreateBlogPayload,
  IUpdateBlogPayload,
  IBlogFilters,
  ICreateCategoryPayload,
  ICreateCommentPayload,
  ICreateTagPayload,
} from "./blog.interface";
import slugify from "slugify";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { BlogStatus, BlogCommentStatus } from "../../../generated/prisma/enums";

// ==================== Helper Functions ====================

const generateUniqueSlug = async (title: string): Promise<string> => {
  const baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const exists = await prisma.blog.findUnique({ where: { slug } });
    if (!exists) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

const calculateReadTime = (content: string): number => {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

// ==================== Blog CRUD Operations ====================

export const createBlog = async (
  authorId: string,
  payload: ICreateBlogPayload,
) => {
  const slug = await generateUniqueSlug(payload.title);
  const readTime = calculateReadTime(payload.content);

  const blog = await prisma.blog.create({
    data: {
      title: payload.title,
      slug,
      content: payload.content,
      excerpt: payload.excerpt || payload.content.slice(0, 200),
      featuredImage: payload.featuredImage,
      images: payload.images || [],
      videoUrl: payload.videoUrl,
      categoryId: payload.categoryId,
      readTime,
      metaTitle: payload.metaTitle,
      metaDescription: payload.metaDescription,
      metaKeywords: payload.metaKeywords,
      authorId,
      status: BlogStatus.DRAFT,
    },
  });

  // Handle tags
  if (payload.tags && payload.tags.length > 0) {
    await handleBlogTags(blog.id, payload.tags);
  }

  return blog;
};

const handleBlogTags = async (blogId: string, tagNames: string[]) => {
  for (const tagName of tagNames) {
    let tag = await prisma.blogTag.findUnique({
      where: { name: tagName },
    });

    if (!tag) {
      tag = await prisma.blogTag.create({
        data: {
          name: tagName,
          slug: slugify(tagName, { lower: true, strict: true }),
        },
      });
    }

    await prisma.blogTagOnBlog.upsert({
      where: { blogId_tagId: { blogId, tagId: tag.id } },
      create: { blogId, tagId: tag.id },
      update: {},
    });
  }
};

export const updateBlog = async (
  blogId: string,
  authorId: string,
  payload: IUpdateBlogPayload,
) => {
  const blog = await prisma.blog.findUnique({ where: { id: blogId } });

  if (!blog) throw new AppError(status.NOT_FOUND, "Blog not found");
  if (blog.authorId !== authorId)
    throw new AppError(status.FORBIDDEN, "You can only edit your own blogs");

  let slug = blog.slug;
  if (payload.title && payload.title !== blog.title) {
    slug = await generateUniqueSlug(payload.title);
  }

  let readTime = blog.readTime;
  if (payload.content && payload.content !== blog.content) {
    readTime = calculateReadTime(payload.content);
  }

  const updated = await prisma.blog.update({
    where: { id: blogId },
    data: {
      ...(payload.title && { title: payload.title, slug }),
      ...(payload.content && { content: payload.content, readTime }),
      ...(payload.excerpt && { excerpt: payload.excerpt }),
      ...(payload.featuredImage !== undefined && {
        featuredImage: payload.featuredImage,
      }),
      ...(payload.images && { images: payload.images }),
      ...(payload.videoUrl !== undefined && { videoUrl: payload.videoUrl }),
      ...(payload.categoryId !== undefined && {
        categoryId: payload.categoryId,
      }),
      ...(payload.metaTitle !== undefined && { metaTitle: payload.metaTitle }),
      ...(payload.metaDescription !== undefined && {
        metaDescription: payload.metaDescription,
      }),
      ...(payload.metaKeywords !== undefined && {
        metaKeywords: payload.metaKeywords,
      }),
      ...(payload.status && { status: payload.status }),
      ...(payload.isFeatured !== undefined && {
        isFeatured: payload.isFeatured,
      }),
      ...(payload.status === BlogStatus.PUBLISHED &&
        !blog.publishedAt && { publishedAt: new Date() }),
    },
  });

  if (payload.tags) {
    await prisma.blogTagOnBlog.deleteMany({ where: { blogId } });
    await handleBlogTags(blogId, payload.tags);
  }

  return updated;
};

export const deleteBlog = async (
  blogId: string,
  userId: string,
  isAdmin: boolean = false,
) => {
  const blog = await prisma.blog.findUnique({ where: { id: blogId } });

  if (!blog) throw new AppError(status.NOT_FOUND, "Blog not found");
  if (blog.authorId !== userId && !isAdmin) {
    throw new AppError(status.FORBIDDEN, "You can only delete your own blogs");
  }

  return prisma.blog.update({
    where: { id: blogId },
    data: { isDeleted: true, deletedAt: new Date() },
  });
};

export const publishBlog = async (blogId: string, authorId: string) => {
  const blog = await prisma.blog.findUnique({ where: { id: blogId } });

  if (!blog) throw new AppError(status.NOT_FOUND, "Blog not found");
  if (blog.authorId !== authorId)
    throw new AppError(status.FORBIDDEN, "You can only publish your own blogs");
  if (blog.status === BlogStatus.PUBLISHED)
    throw new AppError(status.BAD_REQUEST, "Blog is already published");

  return prisma.blog.update({
    where: { id: blogId },
    data: {
      status: BlogStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });
};

// ==================== Blog Query Operations ====================

export const getAllBlogs = async (filters: IBlogFilters) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    tag,
    status,
    sort = "recent",
  } = filters;
  const skip = (page - 1) * limit;

  const where: any = { isDeleted: false };

  if (status) {
    where.status = status;
  } else {
    where.status = BlogStatus.PUBLISHED; // Default: only published
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { content: { contains: search, mode: "insensitive" } },
      { excerpt: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category) where.categoryId = category;
  if (tag) {
    where.tags = { some: { tag: { slug: tag } } };
  }

  let orderBy: any = { publishedAt: "desc" };
  if (sort === "popular") orderBy = { viewCount: "desc" };
  if (sort === "trending") orderBy = { likeCount: "desc" };

  const [blogs, total] = await Promise.all([
    prisma.blog.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        viewCount: true,
        likeCount: true,
        readTime: true,
        publishedAt: true,
        createdAt: true,
        author: {
          select: { id: true, name: true, image: true },
        },
        category: {
          select: { id: true, name: true, color: true },
        },
        tags: {
          select: {
            tag: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    }),
    prisma.blog.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: blogs.map((blog) => ({
      ...blog,
      tags: blog.tags.map((t) => t.tag),
    })),
  };
};

export const getBlogBySlug = async (slug: string) => {
  const blog = await prisma.blog.findUnique({
    where: { slug, isDeleted: false },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      excerpt: true,
      featuredImage: true,
      images: true,
      videoUrl: true,
      viewCount: true,
      likeCount: true,
      shareCount: true,
      readTime: true,
      status: true,
      isFeatured: true,
      metaTitle: true,
      metaDescription: true,
      metaKeywords: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      author: {
        select: { id: true, name: true, image: true, bio: true },
      },
      category: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          description: true,
        },
      },
      tags: {
        select: {
          tag: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
    },
  });

  if (!blog) throw new AppError(status.NOT_FOUND, "Blog not found");

  // Increment view count asynchronously
  prisma.blog
    .update({
      where: { id: blog.id },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  return {
    ...blog,
    tags: blog.tags.map((t) => t.tag),
  };
};

export const getRelatedBlogs = async (
  blogId: string,
  categoryId: string | null,
  limit: number = 3,
) => {
  if (!categoryId) return [];

  return prisma.blog.findMany({
    where: {
      id: { not: blogId },
      categoryId,
      status: BlogStatus.PUBLISHED,
      isDeleted: false,
    },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImage: true,
      publishedAt: true,
      author: {
        select: { name: true, image: true },
      },
    },
  });
};

// ==================== Blog Comments ====================

export const createComment = async (
  userId: string,
  payload: ICreateCommentPayload,
) => {
  const blog = await prisma.blog.findUnique({
    where: {
      id: payload.blogId,
      status: BlogStatus.PUBLISHED,
      isDeleted: false,
    },
  });

  if (!blog) throw new AppError(status.NOT_FOUND, "Blog not found");

  return prisma.blogComment.create({
    data: {
      content: payload.content,
      blogId: payload.blogId,
      userId,
      parentId: payload.parentId,
      status: BlogCommentStatus.APPROVED, // Auto-approve for now
    },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
  });
};

export const getCommentsByBlog = async (
  blogId: string,
  page: number = 1,
  limit: number = 20,
) => {
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    prisma.blogComment.findMany({
      where: {
        blogId,
        parentId: null,
        isDeleted: false,
        status: BlogCommentStatus.APPROVED,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, image: true } },
        replies: {
          where: { isDeleted: false, status: BlogCommentStatus.APPROVED },
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
          take: 5,
        },
      },
    }),
    prisma.blogComment.count({
      where: { blogId, parentId: null, isDeleted: false },
    }),
  ]);

  return {
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    data: comments,
  };
};

export const deleteComment = async (
  commentId: string,
  userId: string,
  isAdmin: boolean = false,
) => {
  const comment = await prisma.blogComment.findUnique({
    where: { id: commentId },
  });

  if (!comment) throw new AppError(status.NOT_FOUND, "Comment not found");
  if (comment.userId !== userId && !isAdmin) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own comments",
    );
  }

  return prisma.blogComment.update({
    where: { id: commentId },
    data: { isDeleted: true },
  });
};

// ==================== Blog Categories ====================

export const getAllCategories = async () => {
  return prisma.blogCategory.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          blogs: { where: { status: BlogStatus.PUBLISHED, isDeleted: false } },
        },
      },
    },
    orderBy: { name: "asc" },
  });
};

export const createCategory = async (payload: ICreateCategoryPayload) => {
  const slug = slugify(payload.name, { lower: true, strict: true });

  return prisma.blogCategory.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      color: payload.color,
      icon: payload.icon,
      image: payload.image,
    },
  });
};

export const updateCategory = async (
  categoryId: string,
  payload: Partial<ICreateCategoryPayload>,
) => {
  let slug: string | undefined;
  if (payload.name) {
    slug = slugify(payload.name, { lower: true, strict: true });
  }

  return prisma.blogCategory.update({
    where: { id: categoryId },
    data: {
      ...payload,
      ...(slug && { slug }),
    },
  });
};

export const deleteCategory = async (categoryId: string) => {
  return prisma.blogCategory.update({
    where: { id: categoryId },
    data: { isActive: false },
  });
};

// ==================== Blog Tags ====================

export const getAllTags = async () => {
  return prisma.blogTag.findMany({
    include: {
      _count: { select: { blogs: true } },
    },
    orderBy: { name: "asc" },
  });
};

export const createTag = async (payload: ICreateTagPayload) => {
  const slug = slugify(payload.name, { lower: true, strict: true });

  return prisma.blogTag.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description,
    },
  });
};

// ==================== Blog Likes ====================

export const toggleLike = async (blogId: string, userId: string) => {
  const existing = await prisma.blogLike.findUnique({
    where: { blogId_userId: { blogId, userId } },
  });

  if (existing) {
    await prisma.blogLike.delete({ where: { id: existing.id } });
    await prisma.blog.update({
      where: { id: blogId },
      data: { likeCount: { decrement: 1 } },
    });
    return { liked: false, message: "Like removed" };
  }

  await prisma.blogLike.create({ data: { blogId, userId } });
  await prisma.blog.update({
    where: { id: blogId },
    data: { likeCount: { increment: 1 } },
  });
  return { liked: true, message: "Blog liked" };
};
