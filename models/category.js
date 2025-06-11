const mongoose = require('mongoose');
const categorySchema = new mongoose.Schema(
{
 name: {
   type: String
 },
 status: {
   type: Boolean,
   default: true
 },
 totalRooms: {
   type: Number,
   required: true
 },
 isAvailable: {
   type: Number,
   default: true
 }, 
 price: {
   type: Number,
   required: true
 },  
});

const categorymodel =mongoose.model('Category', categorySchema);
module.exports = { categorymodel };