const express =  require('express');
const app = express();
const cookieParser = require('cookie-parser');
const cors = require('cors');

require("dotenv").config();

const PORT = process.env.PORT || 4000;
app.use(cors({
    origin: ["http://localhost:3000","https://code-sync-part-1-1.onrender.com"], // Your frontend URL
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
  }));
app.use(express.json());
app.use(cookieParser());

require("./config/database").connect()

// route import and mount 
const user = require("./routes/user");
app.use("/api/v1/auth",user);


const aiRoutes = require('./routes/ai');
app.use('/api/v1/ai', aiRoutes);




// Activate 
app.listen(PORT,() => {
    console.log("Server Run at ",PORT);
})

app.get("/", (req,res) => {
    res.send("<h1>Auth App</h1>")
})

