import { Response } from "express";
import CourseModel from "../models/course.model";


// Create course
export const createCourse = async (data: any, res: Response) => {
  const course = await CourseModel.create(data);
  
  res.status(201).json({
    success: true,
    course,
  });
};
