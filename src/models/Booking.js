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
  },
  { timestamps: true }
);

bookingSchema.index({ roomId: 1, scheduledAt: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
