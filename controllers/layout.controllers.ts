import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import LayoutModel from "../models/layout.model";
import cloudinary from "cloudinary";

// Create layout
export const createLayout = 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      
      if (type === "Banner") {
        const { image, title, subTitle } = req.body;
        const myCloud = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });
        const banner = {
          image: {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          },
          title,
          subTitle,
        };
        await LayoutModel.create(banner);
      }

      if (type === "FAQ") {
        const { faq } = req.body;
        await LayoutModel.create(faq);
      }

      if (type === "Categories") {
        const { categories } = req.body;
        await LayoutModel.create(categories);
      }
      res.status(200).json({
        success: true,
        message: "Layout created successfully",
      });
        
    } catch (error) {
      return next(new ErrorHandler("Error creating layout", 500));
    }
  }
;
