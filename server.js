const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

mongoose.connect(process.env.MONGOOSE_CONNECTION_STRING);
mongoose.set("debug", true);

const userSchema = new mongoose.Schema({email:{type:String, required:true}, password:String , auth_type:{type:String, required:true}});

const User = mongoose.model('User',userSchema);

app.get("/", (req,res)=>{
    res.send(`
    <form>
    <a href="https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&client_id=${process.env.GOOGLE_CLIENT_ID}&access_type=offline&response_type=code&prompt=consent&scope=https://www.googleapis.com/auth/userinfo.email">Login with google</a>
    </form>
    `)
})


app.get("/auth/google",async (req,res)=>{
    const code = req.query.code;
    console.log(code);
    try{
        const {data} = await axios.post("https://oauth2.googleapis.com/token",{code:code, client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri:process.env.GOOGLE_REDIRECT_URI, grant_type:"authorization_code"},{
            
            headers:{
                
                'Content-Type': 'application/json',
            },
           
        })
        const {email_verified, email}= jwt.decode(data.id_token);
        if(!email_verified)return res.send("Email not verified");
        User.findOne({email: email}, (err, user) => {
            if(err)return res.send(err);
            if(user){
                const token = jwt.sign({email: email, uid: user._id}, process.env.JWT_SECRET);
                res.cookie("auth", token, {maxAge: Number(process.env.TOKEN_AGE)});
                res.send("Logged in successfully")
            }else{
                const newUser = new User({email: email, auth_type:"google"});
                newUser.save((err, user)=>{
                    if(err)return res.send(err)
                    const token = jwt.sign({email: email, uid: user._id}, process.env.JWT_SECRET);
                    res.cookie("auth", token, {maxAge: Number(process.env.TOKEN_AGE)});
                    res.send("Registered successfully")
                })
            }

        })

    }catch(e){console.log(e)}
})


app.listen(process.env.PORT, ()=> console.log('listening on port '+process.env.PORT));