import { getCoursesAnalytics, getOrderAnalytics } from './../controllers/analytics.controllers';
import express from "express";
import { authorizeRoles, isAuthenticated } from "../models/auth";
import { getUsersAnalytics } from "../controllers/analytics.controllers";


const analyticsRouter = express.Router();
analyticsRouter.get("/get-users-analytics", isAuthenticated, authorizeRoles("admin"), getUsersAnalytics);
analyticsRouter.get("/get-course-analytics", isAuthenticated, authorizeRoles("admin"), getCoursesAnalytics);
analyticsRouter.get("/get-order-analytics", isAuthenticated, authorizeRoles("admin"), getOrderAnalytics);

export default analyticsRouter;
