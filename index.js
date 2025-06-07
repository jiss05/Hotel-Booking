const express = require('express');
const bodyparser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
var useragent = require('express-useragent');
const bodyParser = require('body-parser');

const adminRoutes = require('./routes/v1/admin/admin');
const endUserRoutes = require('./routes/v1/enduser/enduser');


let app= express();

app.use(bodyParser.urlencoded({
    extended: true, limit: '150mb'
}));

app.use(bodyParser.json({ limit: '150mb'}));

//mount routes

app.use('/v1/admin', adminRoutes);
app.use('/v1/enduser', endUserRoutes);


//PORT DECLARATION

var port =  4321;//CORS SETUP 
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


//SECURITY SETUP
app.use(cors());
app.use(helmet({crossOriginResourcePolicy:false}));

//CONSOLES THE USER INFORMATION AND API CALLS INTO THE SERVER ENVIRONMENT

app.use(useragent.express());
app.use((req, res, next) => {
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    console.log(fullUrl)
    next();
})


mongoose.connect('mongodb+srv://jisskthomas456:jiJISSji@cluster0.o6p50yt.mongodb.net/hotel_book?retryWrites=true&w=majority&appName=Cluster0',

).then(() => {
    console.log('DATABASE CONNECTED SUCCESSFULLY');
}).catch((err) => {
    console.log('Error connecting to database');
    console.log(err);
});


//Server Environment set up
const server = app.listen(port, function () {
    console.log("SERVER RUNNING ON PORT : " + port);
});
