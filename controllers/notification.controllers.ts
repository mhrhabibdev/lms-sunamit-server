import { NextFunction, Request, Response } from "express";
import NotificationModel from "../models/notification.Model";
import ErrorHandler from "../utils/ErrorHandler";

// get all notifications only admin
export const getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await NotificationModel.find().sort({ createdAt: -1 });
    res.status(201).json({
      success: true,
      notifications,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};
