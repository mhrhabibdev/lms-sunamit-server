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

// এনভায়রনমেন্ট ভেরিয়েবল পড়া
const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || '15', 10); // 15 minutes
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '7', 10); // 7 days

// কুকি অপশনস
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  // রেডিসে সেশন স্টোর করুন (TTL সহ)
  const redisExpireTime = refreshTokenExpire * 24 * 60 * 60; // সেকেন্ডে
  redis.set(String(user._id), JSON.stringify(user), 'EX', redisExpireTime);

  // প্রোডাকশনে সিকিউর কুকি
  if (process.env.NODE_ENV === 'production') {
    accessTokenOptions.secure = true;
    refreshTokenOptions.secure = true;
  }

  // কুকি সেট করুন
  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  // রেসপন্স পাঠান
  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
    refreshToken,
  });
};