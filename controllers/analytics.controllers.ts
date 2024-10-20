import { NextFunction, Request, Response } from "express";
import { generateLast12MonthsData } from "../utils/analytics.generator";
import ErrorHandler from "../utils/ErrorHandler";
import UserModel from "../models/user.model";
import CourseModel from "../models/course.model";
import OrderModel from "../models/order.Model";


// get users analytics-only for admin
export const getUsersAnalytics = 
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const users = await generateLast12MonthsData(UserModel);
        res.status(200).json({
          success: true,
          users,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }
    }
  ;
// get users analytics-only for admin
export const getCoursesAnalytics = 
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const course = await generateLast12MonthsData(CourseModel);
        res.status(200).json({
          success: true,
          course,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }
    }
  ;
// get users analytics-only for admin
export const getOrderAnalytics = 
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const order = await generateLast12MonthsData(OrderModel);
        res.status(200).json({
          success: true,
          order,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }
    }
  ;
  