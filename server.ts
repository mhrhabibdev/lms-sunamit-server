
import { app } from "./app"; 
import connectDB from "./utils/db";
require("dotenv").config();
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_SECRET_KEY,
});





// crate server 

app.listen(process.env.PORT, ()=>{
    console.log(`server is coneacted in port ${process.env.PORT}`);
    connectDB();
})