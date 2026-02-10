// Local que pertenece a un owner y contiene Escape Rooms

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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Local", localSchema);
