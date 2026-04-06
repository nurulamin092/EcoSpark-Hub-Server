import { v2 as cloudinary } from "cloudinary";
import { envVars } from "./env";

// Cloudinary configuration
cloudinary.config({
  cloud_name: envVars.CLOUDINARY.CLOUD_NAME,
  api_key: envVars.CLOUDINARY.API_KEY,
  api_secret: envVars.CLOUDINARY.API_SECRET,
  secure: true,
});

const verifyCloudinaryConfig = () => {
  if (
    !envVars.CLOUDINARY.CLOUD_NAME ||
    !envVars.CLOUDINARY.API_KEY ||
    !envVars.CLOUDINARY.API_SECRET
  ) {
    console.warn(
      "⚠️ Cloudinary credentials missing. Image upload will not work.",
    );
    return false;
  }
  console.log("✅ Cloudinary configured successfully");
  return true;
};

export { cloudinary, verifyCloudinaryConfig };
