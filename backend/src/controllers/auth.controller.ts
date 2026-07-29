import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

const authService = new AuthService();

export async function getCurrentUser(
    req: Request,
    res: Response
) {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        const user = await authService.getOrCreateUser(
            req.user.adUsername
        );

        return res.json(user);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Internal Server Error"
        });
    }
}

export async function devSwitchUser(
    req: Request,
    res: Response
) {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: "Unauthorized"
            });
        }

        if (process.env.AUTH_MODE !== "mock") {
            return res.status(403).json({
                error: "This endpoint is only available in mock mode."
            });
        }

        const { role } = req.body;

        const user = await authService.switchUserRole(
            req.user.adUsername,
            role
        );

        return res.json(user);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            error: "Internal Server Error"
        });
    }
}