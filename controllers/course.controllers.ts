import { IUser } from './../models/user.model';
import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import cloudinary from "cloudinary";
import { createCourse, getAllCoursesService } from "../services/course.service";
import CourseModel from "../models/course.model";
import { Stream } from "stream";
import { redis } from "../utils/redis";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import NotificationModel from '../models/notification.Model';






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
    const existingCourse = await CourseModel.findById(courseId); 

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

// add question 


interface IAddQuestionData {
  question: string;
  courseId: string;
  contentId: string;
}

export const addQuestion = async (req: Request, res: Response, next: NextFunction) => {
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

    await NotificationModel.create({
      user: req.user?._id,
      title: "New Question",
      message: `You have a new question in ${courseContent?.title}`,
    });
    

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
};


// add answer in course question 
interface IAddAnswerData {
  answer: string;
  courseId: string;
  contentId: string;
  questionId: string;
}

export const addAnswer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { answer, courseId, contentId, questionId }: IAddAnswerData = req.body;

    const courses = await CourseModel.findById(courseId);

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return next(new ErrorHandler("Invalid content id", 400));
    }

    const courseContent = courses?.courseData?.find((item: any) => item._id.equals(contentId));

    if (!courseContent) {
      return next(new ErrorHandler("Invalid content id", 400));
    }

    const question = courseContent?.questions?.find((item: any) => item._id.equals(questionId));

    if (!question) {
      return next(new ErrorHandler("Invalid question id", 400));
    }

    // Create a new answer object
    const newAnswer: any = {
      user: req.user,
      answer,
    };

    // Add this answer to our course content
    question.questionReplies?.push(newAnswer);

    await courses?.save();

    if (req.user?._id === question.user._id) {
      // Create a notification
      await NotificationModel.create({
        user: req.user?._id,
        title: "Question Reply",
        message: `Your question in ${courseContent?.title} has been replied to.`,
      });
      
    } else {
      const data = {
        name: question.user.name,
        title: courseContent.title,
      };

      const html = await ejs.renderFile(path.join(__dirname, "../mails/question-reply.ejs"), data);

      try {
        await sendMail({
          email: question.user.email,
          subject: "Question Reply",
          template: "question-reply.ejs",
          data
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
      }
    }

    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};


// Add review in course
interface IAddReviewData {
  review: string;
  rating: number;
  userId: string;
}

export const addReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userCourseList = req.user?.courses;
    const courseId = req.params.id;

    // Check if courseId already exists in userCourseList based on id
    const courseExists = userCourseList?.some((courses: any) => courses._id.toString() === courseId.toString());
    if (!courseExists) {
      return next(new ErrorHandler("You are not eligible to access this course", 404));
    }

    const courses = await CourseModel.findById(courseId);
    if (!courses) {
      return next(new ErrorHandler("Course not found", 404));
    }

    const { review, rating } = req.body as IAddReviewData;

    // console.log("100",review)

    const reviewData : any = {
      user: req.user, // Ensure user object contains relevant user details
      rating,
      comment: review,
    };



    courses.reviews.push(reviewData);
// console.log(reviewData);
    // Calculate average rating
    let avg = 0;
    courses.reviews.forEach((rev: any) => {
      avg += rev.rating;
    });

    if (courses) {
      courses.ratings = avg / courses.reviews.length;
    }

    await courses.save();

    const notification = {
      title: "New Review Received",
      message: `${req.user?.name} has given a review in ${courses.name}`,
    };

    // Create notification logic (implement if needed)
    // For now, it's just a console log or some operation
    // console.log(notification);

    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
};

// add review reply
interface IAddReviewData {
  comment: string;
  courseId: string;
  reviewId: string;
}

export const addReplyToReview = 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { comment, courseId, reviewId } = req.body as IAddReviewData;

      const courses = await CourseModel.findById(courseId);
      if (!courses) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const review = courses.reviews?.find(
        (rev: any) => rev._id.toString() === reviewId
      );
      if (!review) {
        return next(new ErrorHandler("Review not found", 404));
      }

      const replyData: any = {
        user: req.user,
        comment,
      };
      if(!review.commentReplies){
        review.commentReplies= [];
      }
    
      review.commentReplies.push(replyData);

      await courses.save();

      res.status(200).json({
        success: true,
        courses,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  };

  // get all courses -only for admin
export const getAllCourse = 
async (req: Request, res: Response, next: NextFunction) => {
  try {
    getAllCoursesService(res);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
}
;

// Delete Course -only for admin
export const deleteCourse = 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const course = await CourseModel.findById(id);
      if (!course) {
        return next(new ErrorHandler("User not found", 404));
      }
      await course.deleteOne({ id });
      await redis.del(id);
      res.status(200).json({
        success: true,
        message: "Course deleted successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
;
