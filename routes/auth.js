const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const multer = require('multer');
const fs = require('fs');
const { body, validationResult } = require('express-validator');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

router.post('/register', async (req, res) => {
    try {
        console.log("Request Body:", req.body);  // ✅ Log request body

        const { name, email, password, role } = req.body;

        if (!password) return res.status(400).json({ msg: 'Password is required' });

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'User already exists' });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log("Hashed Password:", hashedPassword); // ✅ Check if password is hashed

        // Save User with default role if not provided
        user = new User({
            name,
            email,
            password: hashedPassword,
            role: "Admin"
        });

        const savedUser = await user.save();
        console.log("Saved User:", savedUser); // ✅ Check if password is stored in DB

        // Generate JWT Token
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: '1h'
        });

        res.json({ token, user });

    } catch (err) {
        console.error('Error:', err.message);
        res.status(500).send('Server error');
    }
});

// User Login
router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be empty').exists()
], async (req, res) => {
    console.log("Login Request Body:", req.body); // ✅ Log request body

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log("Validation Errors:", errors.array()); // ✅ Log validation errors
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid Credentials' });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid Credentials' });

        // Generate token
        const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, profilePic: user.profilePic });
    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).send('Server Error');
    }
});


// Get all users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude passwords from response
        res.json(users);
    } catch (err) {
        console.error('Get All Users Error:', err.message);
        res.status(500).send('Server Error');
    }
});

router.delete('/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'User deleted successfully' });
    } catch (err) {
        console.error('Delete User Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
