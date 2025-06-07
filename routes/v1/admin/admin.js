const express=require('express')
const router=express();

const bcryptjs =require('bcryptjs') 
const jwt = require('jsonwebtoken');

const {login} = require('../../../models/login')
const {Token} = require('../../../models/token')
const {isAdmin} = require('../../../controllers/middleware')
const {Room} = require('../../../models/room')
const {Category} = require('../../../models/category')

// secret key for JWT
const JWT_SECRET = '@this_is_secret_key'

//user registration

router.post('/v1/admin/register',async (req,res) => {
    try {
        const {name,password,phoneno,role,email}= req.body;
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

const allowedRoles = ['admin', 'user', 'manager'];
if (!allowedRoles.includes(role.toLowerCase())) {
    return res.status(400).json({ status: false, message: 'Role must be one of: admin, user, manager' });
}

    
            
            
     const newpassword = await bcryptjs.hash(password,10) 
     const newuser = new login({
        name : name,
        password : newpassword,
        role : role,
        email : email,
        phoneno : phoneno
          });
          await newuser.save();
            
          // generating token
          const token = jwt.sign(
            {id : newuser.id, email: newuser.email, role: newuser.role},
            JWT_SECRET,
            {expiresIn: '1h'}
          );
          //save tocken to db
          const tokenentry = new Token ({ login_id: newuser._id,token:token});
          await tokenentry.save();

        res.status(200).json({
            status: true,
            message: 'User registered successfully',
            token: token
        });  

        }catch (error) {
        console.log(error);


        res.status(500).json({status : false,message : 'somthing went wrong'});
        
    }
    
});
//end point in '' 
router.post('/v1/admin/login',async (req,res) => {
    try {
        const {email,password} = req.body;
        if(!email || !password) {
            return res.status(400).json({ status : false , message : 'ALL FIELDS ARE REQUIRED'});
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({status : false,message : 'Invalid email format'});
        }
        if(!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(password)) {
            return res.status(400).json({status : false,message : 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'});
        }

        //checking user exists in database
        const user = await login.findOne({email});
        if(!user) {
            return res.status(400).json({ status : false,message :'user not found'});
        }
        //checking password
        const ismatch = await bcryptjs.compare(password, user.password);
        if (!ismatch) {
            return res.status(400).json({status : false,message:'invalid password'});
        }


        //generate a tocken

        const token =jwt.sign(
            {id : user._id, email: user.email, role : user.role},
            JWT_SECRET,
            { expiresIn:'1h'}
        );

        //save

        const tokenentry = new Token({ login_id:user._id,token});
        await tokenentry.save();

        //show success response with the token


        res.status(200).json({
            status:true,
            message: 'Login Successful',
            token
        });



    } catch (error) {
        console.error(error);
        res.status(500).json({status : false, message : 'Something went wrong'});
        
    }
});
router.post('/v1/admin/addcategory', isAdmin, async (req, res) => {
     try {

     console.log (req.user);
        const {name} = req.body;
        if (!name) {
            return res.status(400).json({ status: false, message: 'All fields are required' });
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            return res.status(400).json({ status: false, message: 'Category already exists' });
        }

        // Create new category
        const newCategory = new Category({
            name: name
        });

        await newCategory.save();

        res.status(201).json({
            status: true,
            message: 'Category added successfully',
            category: newCategory
        });
  
    } catch (error) {
    console.error(error);
    res.status(500).json({status : false, message : 'Something went wrong'});
         }



});

// Read all categories

router.get('/v1/admin/getcategories', isAdmin, async (req, res) => {
    try {
        console.log(req.user);
        
        const categories = await Category.find({ status: true });
        res.status(200).json({
            status: true,
            message: 'Categories fetched successfully',
            categories
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Something went wrong' });
    }
});
// Update category
router.put('/v1/admin/updatecategory/:id', isAdmin, async (req,res) => {
    try{
        const {id} = req.params;
        const {name} = req.body;
        if (!name) {
            return res.status(400).json({ status: false, message: 'Category name is required' });
        }
        // Check if category exists   
        const updatedCategory = await Category.findByIdAndUpdate( id,
            { name: name },
            { new: true }
        );
        if(!updatedCategory) {
            return res.status(404).json({ status: false, message: 'Category not found' });
        }
        res.status(200).json({
            status: true,
            message: 'Category updated successfully',
            category: updatedCategory
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Something went wrong' });
        
    }

});
//DElete category
router.delete('/v1/admin/deletecategory/:id', isAdmin, async (req, res) => {
    try {
        const {id} = req.params;
        //soft delete by updating status
        const deletedCategory = await Category.findByIdAndUpdate(
            id,
            {status : false},
            {new: true}
        );
        if(!deletedCategory){
            return req.status(400).json({status : false, message:"Category not found"});
        }
        res.status(200).json({status : true,
            message: 'DELETED SUCCESSFULLY',
            category :deletedCategory
        });

    }
 catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: 'Something went wrong' });
}
});
// user inactive by admin
router.put('/deactive-user/:id', async (req,res)=>{
    try {
        const userId = req.params.id;
        const user=await login.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }
        user.status = false; // Set status to false to deactivate
        await user.save();
        res.status(200).json({ status: true, message: 'User deactivated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Internal server error' });

    }
});

// user active by admin
router.put('/active-user/:id', async (req,res)=>{
    try {
        const userId = req.params.id;
        const user=await login.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }
        user.status = true; // Set status to true to activate
        await user.save();
        res.status(200).json({ status: true, message: 'User activated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Internal server error' });
    }   
});


module.exports=router;