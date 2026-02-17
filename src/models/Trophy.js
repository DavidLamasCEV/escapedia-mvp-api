const mongoose = require("mongoose");

const trophySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    iconUrl: {
      type: String,
      default: null,
      trim: true,
    },

    criteriaKey: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Trophy", trophySchema);
