import express from "express";
import { authorizeRoles, isAuthenticated } from "../models/auth";
import { createLayout } from "../controllers/layout.controllers";



const layoutRouter = express.Router();

layoutRouter.post(
  "/create-layout",
  isAuthenticated,
  authorizeRoles("admin"),
  createLayout
);

export default layoutRouter;
