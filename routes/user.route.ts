
import express from "express";
import { activateUser, deleteUser, getAllUsers, getUserInfo, loginUser, logoutUser, registrationUser, socialAuth, updateAccessToken, updatePassword, updateProfilePicture, updateUserInfo, updateUserRole } from "../controllers/user.controllers"; // Named import for the registrationUser
import { authorizeRoles, isAuthenticated } from "../models/auth";
import { upload } from "../middleware/multer";
const userRouter = express.Router();

// Route for user registration
userRouter.post('/registration', registrationUser);

userRouter.post('/activate-user', activateUser);

userRouter.post('/login', loginUser);

userRouter.get('/logout',isAuthenticated, logoutUser);

userRouter.get('/refresh',updateAccessToken);
userRouter.get('/me',isAuthenticated,getUserInfo);
userRouter.post('/social-auth', socialAuth);
userRouter.put('/update-user-info', isAuthenticated,updateUserInfo);
userRouter.put('/update-user-password', isAuthenticated,updatePassword);


userRouter.put(
  '/update-user-avatar', 
  isAuthenticated, 
  upload.single("avatar"),    // ✅ এইটা দরকার!
  updateProfilePicture
);


userRouter.get('/get-users', isAuthenticated,authorizeRoles("admin"),getAllUsers);
userRouter.put('/update-user-role', isAuthenticated,authorizeRoles("admin"),updateUserRole);
userRouter.delete('/delete-user/:id', isAuthenticated,authorizeRoles("admin"),deleteUser);


export default userRouter;
