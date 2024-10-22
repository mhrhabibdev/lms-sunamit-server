import express from "express";
import { authorizeRoles, isAuthenticated } from "../models/auth";
import { createLayout, editLayout } from "../controllers/layout.controllers";



const layoutRouter = express.Router();

layoutRouter.post(
  "/create-layout",
  isAuthenticated,
  authorizeRoles("admin"),
  createLayout
);
layoutRouter.put(
  "/edit-layout",
  isAuthenticated,
  authorizeRoles("admin"),
  editLayout
);

export default layoutRouter;
