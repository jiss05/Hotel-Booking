const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "login", // Reference to the user model
        required: true
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Category', // Reference to the category model
    },
    noofroomsbooked: {
        type: Number,
        required: true
    },
    checkInDate: {
        type: Date,
        required: true
    },
    checkOutDate: {
        type: Date,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type:Boolean,
        default:true
    }
});

module.exports = mongoose.model("booking", bookingSchema); // This creates a model named 'booking' based on the bookingSchema