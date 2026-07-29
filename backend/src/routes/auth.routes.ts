import { Router } from "express";
import {
    getCurrentUser,
    devSwitchUser
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.get(
    "/auth/me",
    authMiddleware,
    getCurrentUser
);

router.post(
    "/auth/dev-switch-user",
    authMiddleware,
    devSwitchUser
);

export default router;