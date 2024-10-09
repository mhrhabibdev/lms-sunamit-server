import express from "express";
import { authorizeRoles, isAuthenticated } from "../models/auth";
import { editCourse, getSingleCourse, uploadCourse } from "../controllers/course.controllers";


const courseRouter = express.Router();

courseRouter.post(
  "/create-course",
  isAuthenticated,
  authorizeRoles("admin"),
  uploadCourse
);
courseRouter.put(
  "/edit-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  editCourse
);
courseRouter.get(
  "/get-course/:id",
  getSingleCourse
);

export default courseRouter;
