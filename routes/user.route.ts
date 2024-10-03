

import express from "express";
import { activateUser, loginUser, logoutUser, registrationUser } from "../controllers/user.controllers"; // Named import for the registrationUser

const userRouter = express.Router();

// Route for user registration
userRouter.post('/registration', registrationUser);

userRouter.post('/activate-user', activateUser);

userRouter.post('/login', loginUser);
userRouter.get('/logout', logoutUser);

export default userRouter;
