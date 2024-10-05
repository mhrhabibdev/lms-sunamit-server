

import express from "express";
import { activateUser, getUserInfo, loginUser, logoutUser, registrationUser, socialAuth, updateAccessToken } from "../controllers/user.controllers"; // Named import for the registrationUser
import { authorizeRoles, isAuthenticated } from "../models/auth";

const userRouter = express.Router();

// Route for user registration
userRouter.post('/registration', registrationUser);

userRouter.post('/activate-user', activateUser);

userRouter.post('/login', loginUser);

userRouter.get('/logout',isAuthenticated, logoutUser);

userRouter.get('/refresh',updateAccessToken);
userRouter.get('/me',isAuthenticated,getUserInfo);
userRouter.post('/social-auth', socialAuth);
export default userRouter;
