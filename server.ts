
import { app } from "./app"; 
import connectDB from "./utils/db";
require("dotenv").config();
import {v2 as cloudinary} from "cloudinary"

cloudinary.config({
    cloud_name : process.env.CLOUD_NAME,
    api_key : process.env.CLOUD_API,
    api_secret : process.env.CLOUD_SCRET_KEY
})





// crate server 

app.listen(process.env.PORT, ()=>{
    console.log(`server is coneacted in port ${process.env.PORT}`);
    connectDB();
})