var admin = require("firebase-admin");
var serviceAccount = require("./firebasekey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});


module.exports = admin;
// This code initializes Firebase Admin SDK with the service account key.