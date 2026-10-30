import mongoose from "mongoose";
import logger from "./appLogger";
import config from "../config";

let connectedState = false;

export async function connectMongo(): Promise<boolean> {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    connectedState = true;
    logger.info("Connected to MongoDB successfully");
    return true;
  } catch (error: any) {
    logger.warn(`Could not connect to MongoDB at ${config.mongoUri} (${error.message}). ZeroPoint will use memory cache.`);
    connectedState = false;
    return false;
  }
}

export function isMongoConnected(): boolean {
  return connectedState;
}

export default connectMongo;
