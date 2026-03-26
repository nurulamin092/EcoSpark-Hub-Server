import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { IdeaRoutes } from "../modules/idea/idea.route";
import { CategoryRoutes } from "../modules/category/category.route";
import { VoteRoutes } from "../modules/vote/vote.route";
import { CommentRoutes } from "../modules/comment/comment.route";
import { BookmarkRoutes } from "../modules/bookmark/bookmark.route";

const router = Router();
router.use("/auth", AuthRoutes);
router.use("/ideas", IdeaRoutes);
router.use("/categories", CategoryRoutes);
router.use("/votes", VoteRoutes);
router.use("/comments", CommentRoutes);
router.use("/bookmarks", BookmarkRoutes);
export const IndexRoutes: Router = router;
