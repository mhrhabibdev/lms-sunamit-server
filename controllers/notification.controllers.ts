import { NextFunction, Request, Response } from "express";
import NotificationModel from "../models/notification.Model";
import ErrorHandler from "../utils/ErrorHandler";
import cron from 'node-cron';

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

// update notification status --only admin
export const updateNotification =
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const notification = await NotificationModel.findById(req.params.id);
        if (!notification) {
          return next(new ErrorHandler("Notification not found", 404));
        } else {
          notification.status ? (notification.status = "read") : notification?.status;
        }
        await notification.save();
        const notifications = await NotificationModel.find().sort({
          createdAt: -1,
        });
        res.status(201).json({
          success: true,
          notifications,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }
    };



// Schedule a cron job to delete read notifications older than 30 days
cron.schedule("0 0 * * *", async () => { // This runs at midnight (00:00) every day
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  await NotificationModel.deleteMany({
    status: "read",
    createdAt: { $lt: thirtyDaysAgo }
  });
  // console.log('Deleted read notifications');
});
  
