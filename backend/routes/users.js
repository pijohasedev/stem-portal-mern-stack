const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Initiative = require('../models/initiative.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// --- POST /api/users/register ---
// Creates a new user. This is a public route.
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, department } = req.body;

        if (!password) {
            return res.status(400).json({ message: 'Password is required.' });
        }
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role,
            department
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        console.error('--- CRASH IN REGISTER ROUTE ---', error);
        res.status(500).json({ message: 'Server error during registration.', error: error.message });
    }
});

// --- POST /api/users/login ---
// Authenticates a user and provides a token. This is a public route.
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find the user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 2. Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 3. Check if the user's account is suspended
        if (user.status === 'Suspended') {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact an administrator.' });
        }

        // 4. If all checks pass, create and send the token
        const payload = { user: { id: user.id, role: user.role } };
        const JWT_SECRET = 'your-super-secret-key';

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.firstName, role: user.role } });
            }
        );

    } catch (error) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// ✅ NEW ROUTE - GET /api/users/me - Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        const userId = req.user.id; // From JWT token

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get initiatives count
        const initiativesCount = await Initiative.countDocuments({
            assignees: userId
        });

        res.json({
            ...user.toObject(),
            initiativesCount
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({
            message: 'Failed to fetch profile',
            error: error.message
        });
    }
});

// ✅ NEW ROUTE - GET /api/users/me/initiatives - Get current user's initiatives
router.get('/me/initiatives', auth, async (req, res) => {
    try {
        const userId = req.user.id; // From JWT token

        console.log('=== Fetching initiatives for user ===');
        console.log('User ID:', userId);

        // Find all initiatives where this user is in the assignees array
        const initiatives = await Initiative.find({
            assignees: userId
        })
            .populate('strategy', 'name')
            .populate('assignees', 'firstName lastName email')
            .sort({ name: 1 })
            .lean();

        console.log(`✓ Found ${initiatives.length} initiatives for user`);

        res.json(initiatives);

    } catch (error) {
        console.error('Error fetching user initiatives:', error);
        res.status(500).json({
            message: 'Failed to fetch your initiatives',
            error: error.message
        });
    }
});

// --- GET /api/users ---
// Gets a list of all users. (Admin Only)
router.get('/', [auth, adminAuth], async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching users.' });
    }
});

// --- GET /api/users/owners ---
// Gets a list of users with the 'owner' role. (Admin Only)
// IMPORTANT: This specific route must come BEFORE the general '/:id' route.
router.get('/owners', [auth, adminAuth], async (req, res) => {
    try {
        const owners = await User.find({ role: 'owner' }).select('id firstName lastName');
        res.json(owners);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching owners.' });
    }
});

// --- GET /api/users/:id ---
// Gets a single user by their ID. (Admin Only)
router.get('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching single user:', error);
        res.status(500).json({ message: 'Server error fetching user.' });
    }
});

// --- PUT /api/users/:id ---
// Updates a user by their ID. (Admin Only)
router.put('/:id', [auth, adminAuth], async (req, res) => {
    try {
        const { firstName, lastName, email, role, password, department } = req.body;

        const updatedData = { firstName, lastName, email, role, department };

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updatedData.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(req.params.id, updatedData, { new: true }).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: 'User updated successfully!', user: updatedUser });
    } catch (error) {
        // Check if the error is a duplicate key error (code 11000)
        if (error.code === 11000) {
            return res.status(400).json({ message: 'This email is already in use by another account.' });
        }

        console.error('Update User Error:', error);
        res.status(500).json({ message: 'Server error updating user.' });
    }
});

// PATCH /api/users/:id/suspend - Suspend a user
router.patch('/:id/suspend', [auth, adminAuth], async (req, res) => {
    try {
        // Prevent an admin from suspending themselves
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: 'You cannot suspend your own account.' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'Suspended' },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: 'User suspended successfully.', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error while suspending user.' });
    }
});

// PATCH /api/users/:id/activate - Activate a suspended user
router.patch('/:id/activate', [auth, adminAuth], async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: 'Active' },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: 'User activated successfully.', user });
    } catch (error) {
        res.status(500).json({ message: 'Server error while activating user.' });
    }
});

// POST /api/users/bulk-suspend - Suspend multiple users at once
router.post('/bulk-suspend', [auth, adminAuth], async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!userIds || userIds.length === 0) {
            return res.status(400).json({ message: 'No user IDs provided.' });
        }

        await User.updateMany(
            { _id: { $in: userIds } },
            { $set: { status: 'Suspended' } }
        );

        res.json({ message: `${userIds.length} users suspended successfully.` });
    } catch (error) {
        res.status(500).json({ message: 'Server error during bulk suspend.' });
    }
});

// POST /api/users/bulk-activate - Activate multiple users at once
router.post('/bulk-activate', [auth, adminAuth], async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!userIds || userIds.length === 0) {
            return res.status(400).json({ message: 'No user IDs provided.' });
        }

        await User.updateMany(
            { _id: { $in: userIds } },
            { $set: { status: 'Active' } }
        );

        res.json({ message: `${userIds.length} users activated successfully.` });
    } catch (error) {
        res.status(500).json({ message: 'Server error during bulk activate.' });
    }
});

module.exports = router;