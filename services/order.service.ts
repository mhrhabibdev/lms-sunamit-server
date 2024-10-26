import { NextFunction, Response } from "express";
import OrderModel from "../models/order.Model";

// Create a new order
export const newOrder = async (data: any, res: Response, next: NextFunction) => {
  try {
    // Create the order using the OrderModel
    const order = await OrderModel.create(data);
    
    // Send the response with order details
    res.status(201).json({
      success: true,    
      order,
    });
  } catch (error: any) {
    next(error);  
  }
};

// Get All orders
export const getAllordersService = async (res: Response) => {
  const orders = await OrderModel.find().sort({ createdAt: 1 });
  res.status(201).json({
    success: true,
    orders,
  });
};

