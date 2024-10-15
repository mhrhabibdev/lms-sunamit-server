import { NextFunction } from "express";

import OrderModel from "../models/order.Model";
import { catchAsyncError } from "../middleware/catchAsyncErrors";

// create new order
export const newOrder = catchAsyncError(async (data: any, next: NextFunction) => {
  const order = await OrderModel.create(data);
  next(order);
});
