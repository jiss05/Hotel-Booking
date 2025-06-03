const express = require('express');
let app= express();










//port number

var port=2500;

 //server

 const server = app.listen(port, function() { 
    console.log("SERVER RUNNING ON PORT : " + port);
 });
