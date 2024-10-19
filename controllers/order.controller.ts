import { Request, Response, NextFunction } from "express";
import UserModel from "../models/user.model";
import CourseModel from "../models/course.model";
import { getAllordersService, newOrder } from "../services/order.service";
import ErrorHandler from "../utils/ErrorHandler";
import NotificationModel from "../models/notification.Model";

// Create a new order
export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId, payment_info } = req.body;

    // Find the user making the request
    const user = await UserModel.findById(req.user?._id);

    // Check if user already purchased the course
    const courseExistInUser = user?.courses.some((courses: any) => courses.courseId.toString() === courseId);
    if (courseExistInUser) {
      return next(new ErrorHandler("You have already purchased this course", 400));
    }

    // Find the course by ID
    const courses = await CourseModel.findById(courseId);
    if (!courses) {
      return next(new ErrorHandler("Course not found", 404));
    }

    // Prepare the order data to be passed to the service
    const data = {
      courseId: courses._id,
      userId: user?._id,
      payment_info,  // Add payment information
    };

    // Save the course to user's list of purchased courses (push object with courseId)
    if (user) {
      user.courses = [...user.courses, { courseId: courses._id as string }];
      await user.save();  // Save updated user
    }

    // Create a notification for the user about the new order
    await NotificationModel.create({
      user: user?._id,
      title: "New Order",
      message: `You have successfully ordered the course: ${courses.name}`,
    });

     // Increment the purchase count for the course
     if (courses.purchased !== undefined) {
        courses.purchased += 1;
      } else {
        courses.purchased = 1;  // Initialize if it's undefined
      }
      await courses.save();  // Save updated course data

    // Call the order service to create a new order
    await newOrder(data, res, next);

  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};

  // get all orders -only for admin
  export const getAllOrder = 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      getAllordersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
  ;
