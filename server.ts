
import { app } from "./app"; 
import connectDB from "./utils/db";
require("dotenv").config();





// crate server 

app.listen(process.env.PORT, ()=>{
    console.log(`server is coneacted in port ${process.env.PORT}`);
    connectDB();
})