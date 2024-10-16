import mongoose, { Document, Model, Schema } from "mongoose";

// Define the IOrder interface extending Mongoose Document
export interface IOrder extends Document {
  courseId: string;    // ID of the course
  userId: string;      // ID of the user
  payment_info?: object; // Payment information (optional or further specified as needed)
}

// Create the order schema
const orderSchema = new Schema<IOrder>(
  {
    courseId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    payment_info: {
      type: Object,
      // required: true, // Uncomment this line if payment_info should be mandatory
    },
  },
  { timestamps: true }
);

// Create the Order model
const OrderModel: Model<IOrder> = mongoose.model<IOrder>("Order", orderSchema);

// Export the Order model
export default OrderModel;
