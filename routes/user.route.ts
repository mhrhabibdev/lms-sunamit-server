import express from "express";
import { registrationUser } from "../controllers/user.controllers"; // Named import for the registrationUser

const userRouter = express.Router();

// Route for user registration
userRouter.post('/registration', registrationUser);

export default userRouter;
