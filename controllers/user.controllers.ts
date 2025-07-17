require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import UserModel from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import { getAllUsersService, getUserById, updateUserRoleService } from "../services/user.services";
import cloudinary from "cloudinary";


// Interfaces
interface IRegistrationBody {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

interface IActivationToken {
  token: string;
  activationCode: string;
}

interface IActivationRequest {
  activation_token: string;
  activation_code: string;
}

interface ILoginRequest {
  email: string;
  password: string;
}

interface ISocialAuthBody {
  email: string;
  name: string;
  avatar: string;
}

interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

interface IUpdatePassword {
  oldPassword: string;
  newPassword: string;
}

interface IUpdateProfilePicture {
  avatar: string;
}

// User Registration
export const registrationUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password }: IRegistrationBody = req.body;

    const isEmailExist = await UserModel.findOne({ email });
    if (isEmailExist) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    const activationToken = createActivationToken({ name, email, password });
    const activationCode = activationToken.activationCode;

    const data = { user: { name }, activationCode };
    const html = await ejs.renderFile(path.join(__dirname, "../mails/activation-mail.ejs"), data);

    try {
      await sendMail({
        email,
        subject: "Activate your account",
        template: "activation-mail.ejs",
        data,
      });

      res.status(201).json({
        success: true,
        message: `Please check your email: ${email} to activate your account!`,
        activationToken: activationToken.token,
      });
    } catch (emailError: any) {
      return next(new ErrorHandler(emailError.message, 400));
    }
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// Create Activation Token
export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: "5m" }
  );
  return { token, activationCode };
};

// Activate User
export const activateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { activation_token, activation_code } = req.body as IActivationRequest;

    const decoded = jwt.verify(
      activation_token,
      process.env.ACTIVATION_SECRET as string
    ) as { user: IRegistrationBody; activationCode: string };

    if (decoded.activationCode !== activation_code) {
      return next(new ErrorHandler("Invalid activation code", 400));
    }

    const { name, email, password } = decoded.user;

    const existUser = await UserModel.findOne({ email });
    if (existUser) {
      return next(new ErrorHandler("Email already exists", 400));
    }

    const user = await UserModel.create({
      name,
      email,
      password,
      avatar: {
        public_id: "default_avatar_id",
        url: "default_avatar_url",
      },
    });

    res.status(201).json({
      success: true,
      message: "Account activated successfully!",
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// User Login
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as ILoginRequest;

    if (!email || !password) {
      return next(new ErrorHandler("Please enter email and password", 400));
    }

    const user = await UserModel.findOne({ email }).select("+password");
    if (!user) {
      return next(new ErrorHandler("Invalid email or password", 400));
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return next(new ErrorHandler("Invalid email or password", 400));
    }

    sendToken(user, 200, res);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// Logout User
export const logoutUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.cookie("access_token", "", { maxAge: 1 });
    res.cookie("refresh_token", "", { maxAge: 1 });
    
    const userId = req.user?._id;
    if (userId) {
      await redis.del(userId.toString());
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// Update Access Token
export const updateAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refresh_token = req.cookies.refresh_token as string;

    if (!refresh_token) {
      return next(new ErrorHandler("Refresh token not found", 400));
    }

    const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload;

    const session = await redis.get(decoded.id as string);
    if (!session) {
      return next(new ErrorHandler("Please login to access this resource", 400));
    }

    const user = JSON.parse(session);

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.ACCESS_TOKEN as string,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN as string,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRE }
    );

    req.user = user;

    res.cookie("access_token", accessToken, accessTokenOptions);
    res.cookie("refresh_token", refreshToken, refreshTokenOptions);

    await redis.set(user._id, JSON.stringify(user), "EX", parseInt(process.env.REFRESH_TOKEN_EXPIRE || '604800'));

    res.status(200).json({
      success: true,
      accessToken,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// Get User Info
export const getUserInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id as string;
    await getUserById(userId, res);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// Social Authentication
export const socialAuth = async (req: Request, res: Response, next: NextFunction) => {
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
};

// Update User Info
export const updateUserInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email } = req.body as IUpdateUserInfo;
    const userId = req.user?._id;
    const user = await UserModel.findById(userId);

    if (email && user) {
      const isEmailExist = await UserModel.findOne({ email });
      if (isEmailExist && isEmailExist.id.toString() !== userId?.toString()) {
        return next(new ErrorHandler("Email already exists", 400));
      }
      user.email = email;
    }

    if (name && user) {
      user.name = name;
    }

    await user?.save();
    await redis.set(userId?.toString() || '', JSON.stringify(user));

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// Update Password
export const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { oldPassword, newPassword } = req.body as IUpdatePassword;

    if (!oldPassword || !newPassword) {
      return next(new ErrorHandler("Please enter both old and new passwords", 400));
    }

    const user = await UserModel.findById(req.user?._id).select("+password");
    if (!user) {
      return next(new ErrorHandler("User not found", 400));
    }

    const isPasswordMatch = await user.comparePassword(oldPassword);
    if (!isPasswordMatch) {
      return next(new ErrorHandler("Old password is incorrect", 400));
    }

    user.password = newPassword;
    await user.save();
    await redis.set(user.id.toString(), JSON.stringify(user));

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};



export const updateProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;

    if (!file) {
      return next(new ErrorHandler("No image file provided", 400));
    }

    const userId = req.user?._id;
    const user = await UserModel.findById(userId);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    if (user.avatar?.public_id) {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);
    }

    const result = await cloudinary.v2.uploader.upload(file.path, {
      folder: "avatars",
      width: 150,
      crop: "scale",
    });

    user.avatar = {
      public_id: result.public_id,
      url: result.secure_url,
    };

    await user.save();

    await redis.set(userId.toString(), JSON.stringify(user));

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    next(new ErrorHandler(error.message || "Avatar upload failed", 500));
  }
};
// Update Profile Picture
// export const updateProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { avatar } = req.body as IUpdateProfilePicture;
//     const userId = req.user?._id;
//     const user = await UserModel.findById(userId);

//     if (avatar && user) {
//       if (user?.avatar?.public_id) {
//         await cloudinary.v2.uploader.destroy(user.avatar.public_id);
//       }

//       const myCloud = await cloudinary.v2.uploader.upload(avatar, {
//         folder: "avatars",
//         width: 150,
//       });

//       user.avatar = {
//         public_id: myCloud.public_id,
//         url: myCloud.secure_url,
//       };

//       await user.save();
//       await redis.set(userId?.toString() || '', JSON.stringify(user));

//       res.status(200).json({
//         success: true,
//         user,
//       });
//     }
//   } catch (error: any) {
//     return next(new ErrorHandler(error.message, 400));
//   }
// };

// Get All Users (Admin)
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    getAllUsersService(res);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// Update User Role (Admin)
export const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, role } = req.body;
    updateUserRoleService(res, id, role);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};

// Delete User (Admin)
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id);

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    await user.deleteOne();
    await redis.del(id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
};