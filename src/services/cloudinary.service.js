const cloudinary = require("cloudinary").v2;


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


async function uploadBase64Image(imageBase64, folder) {
  const result = await cloudinary.uploader.upload(imageBase64, {
    folder: folder || "escapedia",
    resource_type: "image",
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

async function deleteByPublicId(publicId) {
  return await cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadBase64Image, deleteByPublicId  };
