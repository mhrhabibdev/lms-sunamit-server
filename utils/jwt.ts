// utils/sendToken.ts
import { Response } from "express";
import jwt from "jsonwebtoken";
import { IUser } from "../models/user.model";
import { redis } from "./redis";
import {
  accessTokenOptions,
  refreshTokenOptions,
  convertToSeconds
} from "./tokenOptions";

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessTokenExpire = process.env.ACCESS_TOKEN_EXPIRE || "15m";
  const refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE || "3d";

  const accessToken = jwt.sign(
    { id: user._id },
    process.env.ACCESS_TOKEN!,
    { expiresIn: accessTokenExpire }
  );

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN!,
    { expiresIn: refreshTokenExpire }
  );

  const redisExpireTime = convertToSeconds(refreshTokenExpire);
  redis.set(user._id.toString(), JSON.stringify(user), 'EX', redisExpireTime);

  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("access_token", accessToken, {
    ...accessTokenOptions,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  });

  res.cookie("refresh_token", refreshToken, {
    ...refreshTokenOptions,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  });

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
    refreshToken,
    expiresIn: {
      accessToken: convertToSeconds(accessTokenExpire),
      refreshToken: convertToSeconds(refreshTokenExpire),
    }
  });
};
