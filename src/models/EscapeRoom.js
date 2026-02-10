const mongoose = require("mongoose");

const escapeRoomSchema = new mongoose.Schema(
  {
    localId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Local",
      required: true,
    },

    title: { 
        type: String, 
        required: true, 
        trim: true 
    },

    description: { 
        type: String, 
        required: true, 
        trim: true 
    },

    city: { 
        type: String, 
        required: true, 
        trim: true 
    },

    themes: [{ 
        type: String, 
        trim: true 
    }],

    difficulty: { 
        type: String, 
        enum: ["easy", "medium", "hard"], 
        required: true 
    },

    durationMin: { 
        type: Number, 
        required: true, 
        min: 1 
    },

    playersMin: { 
        type: Number, 
        required: true, 
        min: 1 
    },

    playersMax: { 
        type: Number, 
        required: true, 
        min: 1 
    },

    priceFrom: { 
        type: Number, 
        required: true, 
        min: 0 
    },

    coverImageUrl: { 
        type: String, 
        default: null 
    },

    galleryImageUrls: [{ 
        type: String 
    }],

    isActive: { 
        type: Boolean, 
        default: true 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EscapeRoom", escapeRoomSchema);
