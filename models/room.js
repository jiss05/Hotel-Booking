const mongoose = require('mongoose');
const roomschema = new mongoose.Schema({
    room_no: {
        type: Number,
        
    },
    no_of_rooms: {
        type: Number,
    },
    available_rooms: {
        type: Number,
    },
    status: {
        type: Boolean,
        default: true
    }

});;

const Room = mongoose.model('Room', roomschema);
module.exports = { Room };