const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
    // Token contract address (checksum format for consistency)
    address: {
        type: String,
        required: true,
        unique: true
    },
    // Token metadata
    name: {
        type: String,
        required: true,
        trim: true
    },

    symbol: {
        type: String,
        required: true,
        uppercase: true,
        trim: true
    },

    decimals: {
        type: Number,
        required: true,
        min: 0,
        max: 18,
        default: 18
    },
      // Transfer threshold for alerts
      threshold: {
        type: Number,
        required: false,
        min: 0,
        default: null // Will use global config threshold if not specified
    },

    // Chain information
    chainId: {
        type: Number,
        required: true
    }
}, {
    timestamps: true,
    collection: 'tokens'
});

// Add indexes for better query performance
// Note: address field already has unique index due to unique: true
tokenSchema.index({ chainId: 1 });
tokenSchema.index({ address: 1, chainId: 1 });

module.exports = mongoose.model('Token', tokenSchema);
