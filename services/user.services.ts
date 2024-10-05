import { Response } from "express";
import UserModel from "../models/user.model";


// Get user by ID
export const getUserById = async (id: string, res: Response) => {
  try {
    const user = await UserModel.findById(id);

    res.status(201).json({
      success: true,
      user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
