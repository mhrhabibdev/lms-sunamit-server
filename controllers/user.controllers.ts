require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import UserModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import { sendMail } from "../utils/sendMail";

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

    // Create the user object
    const user = await UserModel.create({
      name,
      email,
      password,
      avatar: {
        public_id: "default_avatar_id", // Default avatar settings
        url: "default_avatar_url",
      },
    });

    // Create activation token and activation code
    const activationToken = createActivationToken(user);
    const activationCode = activationToken.activationCode;

    // Data for the email template
    const data = { user: { name: user.name }, activationCode };

    // Render the activation email template using EJS
    const html = await ejs.renderFile(
      path.join(__dirname, "../mails/activation-mail.ejs"),
      data
    );

    // Send activation email
    try {
      await sendMail({
        email: user.email,
        subject: "Activate your account",
        template: html, // Rendered HTML content
        data,
      });

      // Respond with success message
      res.status(201).json({
        success: true,
        message: `Please check your email: ${user.email} to activate your account!`,
        activationToken: activationToken.token,
      });
    } catch (emailError: any) {
      return next(new ErrorHandler(`Email could not be sent: ${emailError.message}`, 500));
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
    { id: user._id, email: user.email }, // Only necessary data
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: "5m" } // Token valid for 5 minutes
  );
  return { token, activationCode };
};
