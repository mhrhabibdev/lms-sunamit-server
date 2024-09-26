import { NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
module.exports = (err:any,req:Request,res:Response,next:NextFunction)=>{
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal server error';
    // wrong mongoDb id error 
    if(err.name === 'CastError'){
        const message = `Resource not found. Invalid : ${err.path}`;
        err= new ErrorHandler(message,400);
    }

    // Doplicate key error
    if(err.code === 11000){
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
        err = new ErrorHandler(message,400);
    }

    
} 