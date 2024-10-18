import express from "express";
import { authorizeRoles, isAuthenticated } from "../models/auth";
import { getNotifications } from "../controllers/notification.controllers";


const notificationRoute = express.Router();

notificationRoute.get("/get-all-notifications", isAuthenticated, authorizeRoles("admin"), getNotifications);

export default notificationRoute;
