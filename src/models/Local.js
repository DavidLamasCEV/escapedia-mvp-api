const mongoose = require("mongoose");

const localSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    city: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },

    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },

    coverImageUrl: { type: String, trim: true, default: "" },

    coverImagePublicId: { type: String, trim: true, default: "" },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Local", localSchema);
