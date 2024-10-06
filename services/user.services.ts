import { Response } from "express";
import userModel from "../models/user.model"; // Fixed typo "user Model" -> "userModel"
import { redis } from "../utils/redis";

// get user by id
export const getUserById = async (id: string, res: Response): Promise<void> => {
    const userJson = await redis.get(id); // Fixed "user son" -> "userJson"
    if (userJson) { // Fixed "if (user)son)" -> "if (userJson)"
        const user = JSON.parse(userJson); // Fixed "user]son" -> "userJson"
        res.status(201).json({
            success: true,
            user,
        });
    }
};
