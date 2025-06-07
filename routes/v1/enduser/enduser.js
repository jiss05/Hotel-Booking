const express = require('express');
const router = express.Router();



const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken')
const {login : usermodel } = require('../../../models/login')

const { login } = require('../../../models/login');
const { Token } = require('../../../models/token'); 
const {Otp} = require('../../../models/otp');
const sendEmail = require('../../../controllers/email');


const JWT_SECRET = '@this_is_secret_key'




// user registration

router.post('/register', async (req,res )=>{
    try {
        const { email,password,phoneno,name,role} = req.body;
        if (!email || !password || !phoneno || !role || !name) {
            return res.status(400).json({ status: false, message: 'All fields required' });
        }
        if (!/^[a-zA-Z0-9]+$/.test(name)) {
            return res.status(400).json({ status: false, message: 'Name should contain only alphanumeric characters' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ status: false, message: 'Invalid email format' });
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) {
            return res.status(400).json({ status: false, message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character' });
        }
        if (!/^\d{10}$/.test(phoneno)) {
            return res.status(400).json({ status: false, message: 'Phone number must be exactly 10 digits' });
        }
        const allowedRoles = ['user'];
        if (!allowedRoles.includes(role.toLowerCase())) {
            return res.status(400).json({ status: false, message: 'Role must be one of: user' });
        }
        // Check if user already exists
        const existingUser = await login.findOne({ email: email, status: true });
        if (existingUser && existingUser.isverified) {
            return res.status(400).json({ status: false, message: 'User already exists with this email' });
        }
        // Hash the password

        const newpassword = await bcryptjs.hash(password, 10);

        //generate the otp
        const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

        // delete any existing OTP for this user
        await Otp.deleteMany({ email: email });


  if(!existingUser){
        const newuser = new login({
            name: name,
            password: newpassword,
            role: role,
            email: email,
            phoneno: phoneno
        });
        await newuser.save();}
        else{
            existingUser.name = name;
            existingUser.password = newpassword;
            existingUser.role = role;
            existingUser.phoneno = phoneno;
            await existingUser.save();
        }

        //to get the user id
        const newuser = await login.findOne({ email: email, status: true });


        // Save the OTP to the database
        const newOtp = new Otp({
            Loginid: newuser._id, // Use existing user ID or new user ID
            otp: otp,
            email: email,
            expiresAt: otpExpiry
        });

        await newOtp.save();
        // Send the OTP to the user's email

        await sendEmail.sendTextEmail(email, 'Your OTP Code', `Your OTP code is ${otp}. It is valid for 5 minutes.`);

        // generating token 
        // const token = jwt.sign(
        //     { id: newuser._id, role: newuser.role },
        //     JWT_SECRET, // Replace with your actual secret key    
        //     { expiresIn: '1d' }
        // );
        // // Save token to database 

        // const newToken = new Token({
        //     login_id: newuser._id,
        //     token: token
        // });
        // await newToken.save();
        // // Respond with success message and token

        res.status(200).json({ status: true, message: 'OTP send Successfully' });

        
    } catch (error)
     { console.log(error);
        res.status(500).json({ status: false, message: 'Internal server error' });
        
    }
});

// verify otp
router.post('/verifyotp', async (req,res) => {
    try{
        const userOtp = req.body.otp;
        const {email} = req.body;

        const mainadmin = await usermodel.findOne({role: 'admin', status: true});

        if(!userOtp || !email) {
            return res.status(400).json({ status: false, message: 'OTP and email are required' });
        }

        const verifyotp= await Otp.findOne({ email});
        if (!verifyotp) {
            return res.status(400).json({ status: false, message: 'OTP not found for this email' });
        }
        //checking the otp is correct
        if (verifyotp.otp !== userOtp) {
            return res.status(400).json({ status: false, message: 'Invalid OTP' });
        }
        //checking the otp is expired
        if (verifyotp.expiresAt < new Date()) {
            return res.status(400).json({ status: false, message: 'OTP has expired' });
        }
        if(verifyotp.otp === userOtp) {
            // Update user status to verified
            await usermodel.updateOne(
                { email: email },
                { $set: { isverified: true, status: true } }
            );

            const verifieduser = await login.findOne({ _id: verifyotp.Loginid });
            
            //send to admin
            await sendEmail.sendTextEmail(mainadmin.email, 'New User Registration', `A new user has registered with the email: ${email}. Please verify their account.`);                

            return res.status(200).json({status:true, message:"OTP verified and user activated"});

    }
    else{
        return res.status(400).json({
            status:false,
            message:"Invalid OTP"

        });
    }
}
    catch (error){
        console.log(error);
        return res.status(500).json({
            status:false,
            message:"Something went wrong"
        });
    }
});

// user login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ status: false, message: 'Email and password are required' });
        }
        const user = await login.findOne({ email: email, status: true });
        if (!user) {
            return res.status(401).json({ status: false, message: 'Invalid email or password' });
        }
        const isPasswordValid = await bcryptjs.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ status: false, message: 'Invalid email or password' });
        }
        // generating token
        const token = jwt.sign(
            { id: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '1d' }
        );
        // Save token to database
        const newToken = new Token({
            login_id: user._id,
            token: token
        });
        await newToken.save();
        // Respond with success message and token
        res.status(200).json({ status: true, message: 'Login successful', token: token });

    } catch (error) {
        console.log(error);
        res.status(500).json({ status: false, message: 'Internal server error' });
    }
});


// send email
router.post('/sendemail', async (req, res) => {
    try {
        const { to, subject, body } = req.body;
        console.log(req.body);
        if (!to || !subject || !body) {
            return res.status(400).json({ status: false, message: 'All fields are required' });
        }
        await sendEmail.sendTextEmail(to, subject, body);
        res.status(200).json({ status: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Internal server error' });
    }
});




module.exports=router;