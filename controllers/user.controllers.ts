require("dotenv").config();
import { Request,Response,NextFunction } from "express";
import UserModel,{IUser} from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { catchAsyncError } from "../middleware/catchAsyncErrors";
import { Jwt } from "jsonwebtoken";
import ejs from "ejs";




