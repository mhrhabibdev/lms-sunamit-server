require("dotenv").config();
import express, { NextFunction, Request, Response } from "express";
export const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
import ErrorHandler from "./utils/ErrorHandler";
import { ErrorMiddleware } from "./middleware/error";



// body parser 
app.use(express.json({limit:"50mb"}));


// cookie Parser
app.use(cookieParser());

// cros 
app.use(cors({
    origin:process.env.ORIGIN
}));

// testing API

app.get("/test",( req: Request ,res: Response ,next: NextFunction)=>{
res.status(200).json({
    succcess:true,
    message:"API IS WORKING",
});
})

// unkown raout
app.all("*",( req: Request ,res: Response ,next: NextFunction)=>{
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err);

});

app.use(ErrorMiddleware);
