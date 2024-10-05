require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import UserModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import { sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";

// Register User Interface
interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

// Register user function
export const registrationUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password }: IRegistrationBody = req.body;

    // Check if the email already exists
    const isEmailExist = await UserModel.findOne({ email });
    if (isEmailExist) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    // Create activation token and activation code (without creating user in DB)
    const activationToken = createActivationToken({ name, email, password });
    const activationCode = activationToken.activationCode;

    // Data for the email template
    const data = { user: { name }, activationCode };

    // Render the activation email template using EJS
    const html = await ejs.renderFile(path.join(__dirname, "../mails/activation-mail.ejs"), data);

    // Send activation email
    try {
      await sendMail({
        email,
        subject: "Activate your account",
        template: "activation-mail.ejs",
        data,
      });

      // Respond with success message
      res.status(201).json({
        success: true,
        message: `Please check your email: ${email} to activate your account!`,
        activationToken: activationToken.token, // Send token to frontend
      });
    } catch (emailError: any) {
      return next(new ErrorHandler(`Email could not be sent: ${emailError.message}`, 400));
    }

  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// Activation token interface
interface IActivationToken {
  token: string;
  activationCode: string;
}

// Function to create activation token
export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString(); // Generates a 4-digit code
  const token = jwt.sign(
    { user, activationCode }, // Store the user details and the activation code in the token
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: "5m" } // Token valid for 5 minutes
  );
  return { token, activationCode };
};

// Active user interface
interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

// Activate user function (creates the user in the DB after code verification)
export const activateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activation_token, activation_code } = req.body as IActivationRequest;

    // Verify the activation token
    const decoded = jwt.verify(
      activation_token,
      process.env.ACTIVATION_SECRET as string
    ) as { user: { name: string, email: string, password: string }, activationCode: string };

    // Check if activation code matches
    if (decoded.activationCode !== activation_code) {
      return next(new ErrorHandler("Invalid activation code", 400));
    }

    const { name, email, password } = decoded.user;

    // Check if the email already exists in the database
    const existUser = await UserModel.findOne({ email });
    if (existUser) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    // Create the user in the database after successful verification
    const user = await UserModel.create({
      name,
      email,
      password,
      avatar: {
        public_id: "default_avatar_id", // Default avatar settings
        url: "default_avatar_url",
      },
    });

    // Send a success response
    res.status(201).json({
      success: true,
      message: "User activated and created successfully!",
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};
// Login user
interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as ILoginRequest;

    // Check if email and password are provided
    if (!email || !password) {
      return next(new ErrorHandler("Please enter email and password", 400));
    }

    // Find the user by email and include the password field
    const user = await UserModel.findOne({ email }).select("+password");
    if (!user) {
      return next(new ErrorHandler("Invalid email or password", 400));
    }

    // Compare the provided password with the stored password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return next(new ErrorHandler("Invalid email or password", 400));
    }

    // If password matches, send the token
    sendToken(user, 200, res);

  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// Logout user
export const logoutUser = 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Clear cookies by setting maxAge to 1 millisecond
      res.cookie("access_token", "", { maxAge: 1 });
      res.cookie("refresh_token", "", { maxAge: 1 });
      
        redis.del(req.user?._id || '' as any)
      

      // Send success response
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  };


