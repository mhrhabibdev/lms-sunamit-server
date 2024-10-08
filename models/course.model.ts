import mongoose, { Document, Model, Schema } from "mongoose";

interface IComment extends Document {
  user: object;
  comment: string;
  commentReplies?: IComment[];
}

interface IReview extends Document {
  user: object;
  rating: number;
  comment: string;
  commentReplies: IComment[];
}

interface ILink extends Document {
  title: string;
  url: string;
}

interface ICourseData extends Document {
  title: string;
  description: string;
  videoUrl: string;
  videoThumbnail: object;
  videoSection: string;
  videoLength: number;
  videoPlayer: string;
  links: ILink[];
  suggestion: string;
  questions: IComment[];
}


interface ICourse extends Document {
    name: string;
    description: string;
    price: number;
    estimatedPrice?: number;
    thumbnail: object;
    tags: string;
    level: string;
    demoUrl: string;
    benefits: { title: string }[];
    prerequisites: { title: string }[];
    reviews: IReview[];
    courseData: ICourseData[];
    ratings?: number;
    purchased?: number;
  }
  
  // Review schema
  const reviewSchema = new Schema<IReview>({
    user: Object,
    rating: {
      type: Number,
      default: 0,
    },
    comment: String,
  });
  
  // Link schema
  const linkSchema = new Schema<ILink>({
    title: String,
    url: String,
  });

  const commentSchema = new Schema<IComment>({
    user: Object,
    comment: String,
    commentReplies: [Object]
  });
  
  const courseDataSchema = new Schema<ICourseData>({
    videoUrl: String,
    videoThumbnail: Object, // corrected the typo
    title: String,
    videoSection: String,
    description: String,
    videoLength: Number,
    videoPlayer: String,
    links: [linkSchema],
    suggestion: String,
    questions: [commentSchema],
  });


  
  