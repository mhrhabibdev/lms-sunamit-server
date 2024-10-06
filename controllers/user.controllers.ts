
require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import UserModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import { getUserById } from "../services/user.services";
import cloudinary from "cloudinary"

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


// update access token
export const updateAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refresh_token = req.cookies.refresh_token as string;

    // Verify the refresh token
    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload;
    const message = 'Could not refresh token';

    if (!decoded) {
      return next(new ErrorHandler(message, 400));
    }

    // Get session from Redis
    const session = await redis.get(decoded.id as string);
    if (!session) {
      return next(new ErrorHandler(message, 400));
    }

    const user = JSON.parse(session);

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.ACCESS_TOKEN as string,  // Use ACCESS_TOKEN_SECRET
      {
        expiresIn: "5m",
      }
    );
    
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN as string,  // Use REFRESH_TOKEN_SECRET
      {
        expiresIn: "3d",
      }
    );

    req.user=user;
    
    // Set cookies for access token and refresh token
    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, refreshTokenOptions);
    
    // Send success response with access token
    res.status(200).json({
      status: "success",
      accessToken,
    });
    
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// get user info
export const getUserInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id as string;

    // Assuming getUserById is a function that fetches user data by userId
    await getUserById(userId, res);
    
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

interface ISocialAuthBody {
  email: string;
  name: string;
  avatar: string;
}

// Social auth
export const socialAuth = 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, name, avatar } = req.body as ISocialAuthBody;
      const user = await UserModel.findOne({ email });

      if (!user) {
        const newUser = await UserModel.create({ email, name, avatar });
        sendToken(newUser, 200, res);
      } else {
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
;

// update user info

interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

export const updateUserInfo = 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email } = req.body as IUpdateUserInfo;
      const userId : any = req.user?._id;
      const user = await UserModel.findById(userId);

      if (email && user) {
        const isEmailExist = await UserModel.findOne({ email });
        if (isEmailExist) {
          return next(new ErrorHandler("Email already exists", 400));
        }
        user.email = email;
      }

      if (name && user) {
        user.name = name;
      }

      await user?.save();
      await redis.set(userId, JSON.stringify(user));

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
;

// Interface for password update request
interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

export const updatePassword = 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdatePassword;

      // Ensure both old and new passwords are provided
      if (!oldPassword || !newPassword) {
        return next(new ErrorHandler("Please enter both old and new passwords", 400));
      }

      // Find the user by ID and explicitly include the password field
      const user = await UserModel.findById(req.user?._id).select("+password");

      // Check if the user exists and has a password
      if (!user || user.password === undefined) {
        return next(new ErrorHandler("User not found or invalid", 400));
      }

      // Compare the provided old password with the current password
      const isPasswordMatch = await user.comparePassword(oldPassword);
      if (!isPasswordMatch) {
        return next(new ErrorHandler("Old password is incorrect", 400));
      }

      // Set the new password and save the user
      user.password = newPassword;
      await user.save();

      // Store updated session in Redis, ensuring _id is a string
      if (req.user && req.user._id) {
        await redis.set(String(req.user._id), JSON.stringify(user));
      } else {
        return next(new ErrorHandler("User ID is missing", 400));
      }

      // Return success response
      res.status(201).json({
        success: true,
        message: "Password updated successfully",
        user,
      });

    } catch (error: any) {
      // Handle any errors during the process
      return next(new ErrorHandler(error.message, 400));
    }
  };

// Update profile picture with IUpdateProfilePicture interface
interface IUpdateProfilePicture {
  avatar: string;
}

// update profile picture
export const  updateProfilePicture  = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body;
      const userId : any = req.user?._id;
      const user = await UserModel.findById(userId);
      if (avatar && user) {
        // if user has one avatar then call this if
        if (user?.avatar?.public_id) {
          // first delete the old image
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
        }

        const myCloud = await cloudinary.v2.uploader.upload(avatar, {
          folder: "avatars",
          width: 150,
        });

        user.avatar = {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };

        await user.save();
        await redis.set(userId, JSON.stringify(user));
        res.status(200).json({
          success: true,
          user,
        });
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
;





