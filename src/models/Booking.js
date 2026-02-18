const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },

    roomId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "EscapeRoom", 
        required: true 
    },

    scheduledAt: { 
        type: Date, 
        required: true 
    },

    players: { 
        type: Number, 
        required: true, 
        min: 1 
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },

    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdByRole: {
      type: String,
      enum: ["user", "owner", "admin"],
      required: true,
    },

    customerNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    internalNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    isDeleted: { 
      type: Boolean, 
      default: false, 
      index: true 
    },

    deletedAt: { 
      type: Date, 
      default: null 
    },

  },
  { timestamps: true }
);

bookingSchema.index({ roomId: 1, scheduledAt: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
