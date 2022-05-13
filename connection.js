const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(`mongodb+srv://chatApp:${process.env.DB_PW}@cluster0.mgnrv.mongodb.net/chatApp?retryWrites=true&w=majority`, () => {
    console.log("Connected to mongoDB");
});