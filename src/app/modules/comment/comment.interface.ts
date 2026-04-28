export interface ICreateCommentPayload {
  content: string;
  ideaId: string;
  parentId?: string;
}

export interface IUpdateCommentPayload {
  content: string;
}

export interface CommentUser {
  id: string;
  name: string;
  image: string | null;
}

export interface BaseComment {
  id: string;
  content: string;
  userId: string;
  ideaId: string;
  parentId: string | null;
  path: string;
  depth: number;
  isDeleted: boolean;
  isEdited: boolean;
  editCount: number;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
  user: CommentUser;
}

export interface CommentWithReplies extends BaseComment {
  replies: CommentWithReplies[];
}
export type CommentTreeNode = CommentWithReplies;
export type CommentWithUser = BaseComment;

export interface CreateCommentMeta {
  ip?: string;
  userAgent?: string;
}

export interface DeleteCommentMeta {
  ip?: string;
  userAgent?: string;
}

export interface ReplyData {
  id: string;
  content: string;
  userId: string;
  ideaId: string;
  parentId: string | null;
  path: string;
  depth: number;
  isDeleted: boolean;
  isEdited: boolean;
  editCount: number;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
  user: CommentUser;
}

