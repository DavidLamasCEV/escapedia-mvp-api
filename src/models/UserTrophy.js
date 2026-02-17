const mongoose = require("mongoose");

const userTrophySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    trophyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trophy",
      required: true,
      index: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);


userTrophySchema.index({ userId: 1, trophyId: 1 }, { unique: true });

module.exports = mongoose.model("UserTrophy", userTrophySchema);
