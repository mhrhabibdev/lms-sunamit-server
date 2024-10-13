import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse } from "../services/course.service";
import CourseModel from "../models/course.model";
import { Stream } from "stream";
import { redis } from "../utils/redis";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import mongoose from "mongoose";





// Upload course
export const uploadCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body;
    const thumbnail = req.file; // Access the uploaded file from multer

    if (thumbnail) {
      // If a thumbnail is uploaded, upload it to Cloudinary
      const myCloud = await cloudinary.v2.uploader.upload_stream(
        { folder: "courses" },
        (error, result) => {
          if (error) {
            return next(new ErrorHandler("Cloudinary upload failed", 500));
          }

          // Save Cloudinary response data to the course data
          data.thumbnail = {
            public_id: result?.public_id,
            url: result?.secure_url,
          };

          // Create the course after the upload is complete
          createCourse(data, res);
        }
      );

      // Create a stream to upload the thumbnail buffer
      const stream = require("stream");
      const bufferStream = new stream.PassThrough();
      bufferStream.end(thumbnail.buffer); // Use the buffer from multer
      bufferStream.pipe(myCloud); // Pipe the buffer to Cloudinary upload stream
    } else {
      // If no thumbnail is uploaded, proceed to create the course without it
      data.thumbnail = null; 

      // Create the course without a thumbnail
      await createCourse(data, res);
    }
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};


// Edit course
export const editCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = req.params.id; // Get the course ID from params
    const existingCourse = await CourseModel.findById(courseId); // Fetch the existing course

    if (!existingCourse) {
      return next(new ErrorHandler("Course not found", 404));
    }

    const data = req.body;
    const thumbnail = req.file; // Access the uploaded file from multer

    if (thumbnail) {
      // Remove the old thumbnail from Cloudinary
      await cloudinary.v2.uploader.destroy(thumbnail.public_id);

      // Upload the new thumbnail using the buffer
      const myCloud = await cloudinary.v2.uploader.upload_stream(
        { folder: "courses" },
        (error, result) => {
          if (error) {
            return next(new ErrorHandler("Cloudinary upload failed", 500));
          }

          // Update thumbnail data
          data.thumbnail = {
            public_id: result?.public_id,
            url: result?.secure_url,
          };
        }
      );

      // Create a stream to upload the thumbnail buffer
      const bufferStream = new Stream.PassThrough();
      bufferStream.end(thumbnail.buffer); 
      bufferStream.pipe(myCloud); 
    }

    const course = await CourseModel.findByIdAndUpdate(courseId, {
      $set: data,
    }, { new: true });

    res.status(200).json({
      success: true,
      course,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};


// Get single course without purchasing
export const getSingleCourse =
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;

      // Check if the course exists in cache
      const isCacheExist = await redis.get(courseId);

      if (isCacheExist) {
        // If cache exists, return the cached course
        const course = JSON.parse(isCacheExist);
        return res.status(200).json({
          success: true,
          course,
        });
      } else {
        // If cache does not exist, fetch the course from the database
        const course = await CourseModel.findById(courseId).select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );

        if (!course) {
          return next(new ErrorHandler("Course not found", 404));
        }

        // Store the course in cache
        await redis.set(courseId, JSON.stringify(course));

        // Return the fetched course
        res.status(200).json({
          success: true,
          course,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
;

// Get all courses without purchasing
export const getAllCourses =  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if courses are cached
      const isCacheExist = await redis.get("allCourses");

      if (isCacheExist) {
        // If cache exists, return the cached courses
        const courses = JSON.parse(isCacheExist);
        return res.status(200).json({
          success: true,
          courses,
        });
      } else {
        // If cache does not exist, fetch courses from the database
        const courses = await CourseModel.find().select(
          "-courseData.videoUrl -courseData.suggestion -courseData.questions -courseData.links"
        );

        // Store the courses in cache
        await redis.set("allCourses", JSON.stringify(courses));

        // Return the fetched courses
        res.status(200).json({
          success: true,
          courses,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
;

// get course content only for valid user
export const getCourseByUser = 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userCourseList = req.user?.courses;
      const courseId = req.params.id;

      console.log("User Course List:", userCourseList);
      console.log("Course ID:", courseId);

      const courseExists = userCourseList?.find(
        (course: any) => course._id.toString() === courseId
      );

      if (!courseExists) {
        return next(
          new ErrorHandler("You are not eligible to access this course", 404)
        );
      }

      const courses = await CourseModel.findById(courseId);
      if (!courses) {
          return next(new ErrorHandler("Course not found", 404));
      }
      const content = courses.courseData;
      
      res.status(200).json({
        success: true,
        content,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
;



interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { question, courseId, contentId }: IAddQuestionData = req.body;

    // Find the course by courseId
    const courses = await CourseModel.findById(courseId);
    if (!courses) {
      return next(new ErrorHandler("Course not found", 404));
    }

    // Validate contentId
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return next(new ErrorHandler("Invalid content ID", 400));
    }

    // Find the specific content in the course
    const courseContent = courses.courseData?.find((item: any) => item._id.equals(contentId));
    if (!courseContent) {
      return next(new ErrorHandler("Content not found", 404));
    }

    // Create a new question object
    const newQuestion :any = {
      user: req.user, // Make sure `req.user` contains the logged-in user
      question,
      questionReplies: [], // Empty replies initially
    };

    // Add the new question to the course content
    courseContent.questions.push(newQuestion);

    // Save the updated course
    await courses.save();

    // Send response
    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
});



