import { Request, Response, NextFunction } from "express";

export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const mode = process.env.AUTH_MODE;
    let adUsername: string | undefined;

    switch (mode) {

        case "mock":
            adUsername = req.headers["x-mock-user"] as string;
            break;

        case "iwa":
            adUsername = req.headers["x-remote-user"] as string;
            break;

        default:
            return res.status(500).json({
                error: "Unknown authentication mode"
            });
    } 

    if (!adUsername) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    req.user = {
        adUsername,
        authMethod: mode
    };

    return next();
}