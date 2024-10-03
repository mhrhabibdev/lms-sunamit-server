

import express from "express";
import { activateUser, loginUser, registrationUser } from "../controllers/user.controllers"; // Named import for the registrationUser

const userRouter = express.Router();

// Route for user registration
userRouter.post('/registration', registrationUser);

userRouter.post('/activate-user', activateUser);

userRouter.post('/login', loginUser);

export default userRouter;
