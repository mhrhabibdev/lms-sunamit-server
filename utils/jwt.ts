require("dotenv").config();
import { IUser } from "../models/user.model";
import { Response } from "express";
import { redis } from "./redis";

interface ITokenOptions {
    expires: Date;
    maxAge: number;
    httpOnly: boolean;
    sameSite: 'lax' | 'strict' | 'none' | undefined;
    secure?: boolean;
  }
  
  export const sendToken = (user: IUser, statusCode: number, res: Response) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken(); // Fixed variable name

    // uplode sassion to redis

    // redis.set(user._id, JSON.stringify(user) as any);
    // Ensure the user._id is converted to string
redis.set(String(user._id), JSON.stringify(user));


  
    // Parse environment variables to integrate with fallback values
    const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || '300', 10);
    const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '1200', 10); // Fixed variable name
  
    // Options for cookies
    const accessTokenOptions: ITokenOptions = {
      expires: new Date(Date.now() + accessTokenExpire * 1000), // Fixed multiplication operator
      maxAge: accessTokenExpire * 1000, // Fixed multiplication operator
      httpOnly: true,
      sameSite: 'lax',
    //   secure: process.env.NODE_ENV === 'production', // Set secure to true in production
    };
  
    const refreshTokenOptions: ITokenOptions = {
      expires: new Date(Date.now() + refreshTokenExpire * 1000), // Fixed multiplication operator
      maxAge: refreshTokenExpire * 1000, // Fixed multiplication operator
      httpOnly: true,
      sameSite: 'lax',
    //   secure: process.env.NODE_ENV === 'production', // Set secure to true in production
    };
  
// Only set secure to true in production
if (process.env.NODE_ENV === 'production') {  // Fixed comparison operator
    accessTokenOptions.secure = true;
    refreshTokenOptions.secure = true; // Ensuring refreshToken is also secure in production
  }
  
  // Set cookies for access token and refresh token
  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions); // Fixed variable name
  
  // Send the response with status code and tokens
  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
    refreshToken, // Return refresh token in the response if necessary
  });
  
}