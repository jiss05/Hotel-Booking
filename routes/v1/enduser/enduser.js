const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');

const bcryptjs = require('bcryptjs');
const pdf = require('pdfmake');
const jwt = require('jsonwebtoken')
const {login : usermodel } = require('../../../models/login')

const { isUser } = require('../../../controllers/middleware');

const { login } = require('../../../models/login');
const { Token } = require('../../../models/token'); 
const {Otp} = require('../../../models/otp');
const sendEmail = require('../../../controllers/email');
const bookingmodel = require('../../../models/booking');
const {categorymodel} = require('../../../models/category');

const fonts = {
    Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
    }
};

const printer = new pdf(fonts);


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

        const mainadmin = await usermodel.findOne({role: 'user', status: true});

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


router.post("/bookroom", isUser, async (req, res) => {
  try {

    const userid = req.user._id;

    const categoryId = req.query.categoryId;

    const { noofrooms, checkInDate, checkOutDate } = req.body;




    if (!categoryId) {
      return res
        .status(400)
        .json({ status: false, message: "categoryId is required" });
    }

    const category = await categorymodel.findOne({ _id: categoryId });

    if(!category){
      return res.status(400).json({
        status:false,
        message:"No category found"
      })
    }

    const checkOut = new Date(checkOutDate);
    const checkIn = new Date(checkInDate);

    if(category.isAvailable<noofrooms){
      const bookingsThatEndToday=await bookingmodel.aggregate(
        [
            {
      $match: {
        category: new mongoose.Types.ObjectId(categoryId),
        checkOutDate: {
          $gte: checkIn,
          $lt: new Date(checkIn.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    },
    {
      $group: {
        _id: null,
        roomsFreed: { $sum: "$noofroomsbooked" },
      },
    },
          
        ]
      )

       const roomsToFree = bookingsThatEndToday[0]?.roomsFreed || 0;

  if (roomsToFree > 0) {
    // "Return" the rooms to category pool
    category.isAvailable += roomsToFree;
    await category.save(); // update immediately
  }

  // Re-check again
  if (category.isAvailable < noofrooms) {
    return res.status(400).json({
      status: false,
      message: "Not enough rooms available, even after checking same-day checkouts",
    });
  }

    }


    const today = new Date();

    checkIn.setHours(0, 0, 0, 0); // normalize to start of the day

    today.setHours(0, 0, 0, 0); // remove time portion

    // if (category.isavailable < noofrooms) {
    //   return res
    //     .status(400)
    //     .json({ status: false, message: "Not enough rooms available" });
    // }

    // Step 1: Check if dates are valid
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid check-in or check-out date" });
    }

    // Step 2: Check check-in is today or within 3 days
    const maxCheckInDate = new Date();
    maxCheckInDate.setDate(today.getDate() + 3);

    if (checkIn < today || checkIn > maxCheckInDate) {
      return res.status(400).json({
        status: false,
        message: "Check-in date must be within 3 days from today",
      });
    }

    // Step 3: Check check-out is after check-in
    if (checkOut <= checkIn) {
      return res.status(400).json({
        status: false,
        message: "Check-out must be after check-in",
      });
    }

    // Count bookings with the same checkInDate
    const bookingsCount = await bookingmodel.countDocuments({
      checkInDate: {
        $gte: checkIn,
        $lt: new Date(checkIn.getTime() + 24 * 60 * 60 * 1000), // less than next day
      },
    });

    if (bookingsCount >= 15) {
      return res.status(400).json({
        status: false,
        message:
          "Maximum bookings reached for this day, please choose another date",
      });
    }

    category.isAvailable = category.isAvailable - noofrooms;
    await category.save();

    const totalamount = noofrooms * category.price;

    const booking = new bookingmodel({
      user: userid,
      category: new mongoose.Types.ObjectId(categoryId),
      noofroomsbooked: noofrooms,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalAmount: totalamount,
    });

    await booking.save();

    const user = await usermodel.findOne({ _id: userid });

    const htmlContent = `
      <h2>Booking Confirmed</h2>
      <p>Dear ${user.name},</p>
      <p>Your booking has been confirmed for ${noofrooms} room(s) in room type of ${category.categoryname} from 
      <strong>${checkInDate}</strong> to <strong>${checkOutDate}</strong>.</p>
      <p>Total Amount: ₹${totalamount}</p>
      <p>Thank you for choosing us!</p>
    `;

    // Define the PDF content
    const docDefinition = {
      pageSize: "A4",
      pageOrientation: "landscape", // 💥 makes page wider
      pageMargins: [20, 40, 20, 40],
      content: [
        { text: "Booking Confirmation", style: "header" },
        { text: "\n" },
        { text: `Name: ${user.name}` },
        { text: `Check-In Date: ${checkIn}` },
        { text: `Check-Out Date: ${checkOut}` },
        { text: `Rooms Booked: ${noofrooms}` },
        { text: `Total Amount: ₹${totalamount}` },
        { text: `Category: ${category.categoryname}` },
      ],
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          alignment: "center",
        },
      },
    };

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    let chunks = [];

    pdfDoc.on("data", (chunk) => chunks.push(chunk));

    pdfDoc.on("end", async () => {
      const result = Buffer.concat(chunks);

      // // 1. Set headers for direct download (if you still want to send PDF in response)
      // res.setHeader("Content-Type", "application/pdf");
      // res.setHeader("Content-Disposition", "attachment; filename=booking.pdf");
      // res.send(result);

      // 2. Send email with PDF attachment
      await sendEmail.sendTextEmail(
        user.email,
        "Booking Confirmed",
        htmlContent, // your HTML email body
        [
          {
            filename: "booking.pdf",
            content: result,
            contentType: "application/pdf",
          },
        ]
      );
    });

    pdfDoc.end();

    res.status(200).json({
      status: true,
      message: "Room Booked Succesfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: "Something went wrong",
    });
  }
});

// cancel a booking by user and update available rooms in category
router.post('/cancel/:bookingid', isUser, async (req, res) => {
  try {
    const userId = req.user._id;
    const bookingId = req.params.bookingid;

    const bookingofuser = await bookingmodel.findOne({ user: userId, _id: bookingId });

    if (!bookingofuser || bookingofuser.status === false) {
      return res.status(400).json({
        status: false,
        message: 'Booking not found'
      });
    }

    // Mark booking as cancelled
    bookingofuser.status = false;
    await bookingofuser.save();

    // Add the booked rooms back to the category's available rooms
    const category = await categorymodel.findById(bookingofuser.category);
    if (category) {
      category.isAvailable += bookingofuser.noofroomsbooked;
      await category.save();
    }

    res.status(200).json({
      status: true,
      message: 'Booking cancelled Successfully and rooms updated'
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({
      status: false,
      message: 'Something went wrong'
    });
  }
});



module.exports=router;