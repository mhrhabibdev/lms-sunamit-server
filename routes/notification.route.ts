import express from "express";
import { authorizeRoles, isAuthenticated } from "../models/auth";
import { getNotifications, updateNotification } from "../controllers/notification.controllers";


const notificationRoute = express.Router();

notificationRoute.get("/get-all-notifications", isAuthenticated, authorizeRoles("admin"), getNotifications);
notificationRoute.put("/update-notifications/:id", isAuthenticated, authorizeRoles("admin"), updateNotification);

export default notificationRoute;
