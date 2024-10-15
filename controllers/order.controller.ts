import  ejs  from 'ejs';
import { newOrder } from './../services/order.service';
import { NextFunction, Request, Response } from "express";
import { Document, ObjectId } from "mongoose";
import CourseModel from "../models/course.model";
import { IOrder } from "../models/order.Model";
import UserModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import NotificationModel from '../models/notification.Model';
import sendMail from '../utils/sendMail';
import path from 'path';


// create order
export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, payment_info } = req.body as IOrder;
      const user = await UserModel.findById(req.user?._id);
      const courseExistInUser = user?.courses.some((course: any) => course._id.toString() === courseId);
  
      if (courseExistInUser) {
        return next(new ErrorHandler("You have already purchased this course", 400));
      }
  
      const course = await CourseModel.findById(courseId);
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
  
      const data: any = {
        courseId: course._id,
        userId: user?._id,
        // payment_info,  // added payment_info to match the context
      };

      newOrder(data, next);

const mailData = {
  order: {
    _id: (course._id as string).slice(0, 6),
    name: course.name,
    price: course.price,
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  },
};

const html = await ejs.renderFile(path.join(__dirname, '../mails/order-confirmation.ejs'), { order: mailData });

try {
  if (user) {
    await sendMail({
      email: user.email,
      subject: "Order Confirmation",
      template: "order-confirmation.ejs",
      data: mailData,
    });
  }
} catch (error: any) {
  return next(new ErrorHandler(error.message, 500));
}

user?.courses.push(course._id as any);
await user?.save();

await NotificationModel.create({
  user: user?._id,
  title: "New Order",
  message: `You have a new order from ${course?.name}`, // Fixed string template literal
});

res.status(201).json({
  success: true, // Fixed typo from "succcess" to "success"
  order: course,
});

} catch (error: any) {
  return next(new ErrorHandler(error.message, 500));
}


}