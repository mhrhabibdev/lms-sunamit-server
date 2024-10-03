import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";


export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const access_token = req.cookies.access_token as string;

  // Check if access_token is present
  if (!access_token) {
    return next(new ErrorHandler("Please login to access this resource", 400));
  }

  // Verify the access token
  const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;

  // Check if the decoded token is valid
  if (!decoded) {
    return next(new ErrorHandler("Access token is not valid", 400));
  }

  // Retrieve user information from Redis
  const user = await redis.get(decoded.id);
  
  // Check if the user exists
  if (!user) {
    return next(new ErrorHandler("User not found", 400));
  }

  // Attach user information to the request object
  req.user = JSON.parse(user);
  next();
};

// Validate user role
export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      // Check if the user's role is included in the allowed roles
      if (!roles.includes(req.user?.role || '')) {
        return next(new ErrorHandler(`Role: ${req.user?.role} is not allowed to access this resource`, 403));
      }
      next();
    };
  };