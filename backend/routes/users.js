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
        const { firstName, lastName, email, password, role, department, state, ppd } = req.body;

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
            role: role || 'user',
            department,
            state,
            ppd
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

                // ✅ PEMBETULAN: Hantar objek user yang lebih lengkap
                res.json({
                    token,
                    user: {
                        id: user.id,
                        firstName: user.firstName, // Gunakan nama field yang sebenar
                        lastName: user.lastName,
                        email: user.email,
                        role: user.role,
                        department: user.department,
                        state: user.state,
                        ppd: user.ppd
                    }
                });
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
        const userId = req.user.id;
        const user = req.user; // Kita dapat data penuh dari middleware 'auth.js'

        console.log(`=== Fetching initiatives for user ${user.email} (Role: ${user.role}) ===`);

        // Bina tapisan (filter) dinamik
        const filter = {
            $or: [
                // 1. Inisiatif ditugaskan terus kepada SAYA
                { assignees: userId },

                // 2. Inisiatif ditugaskan kepada ROLE saya
                { assignedRole: user.role },

                // 3. Inisiatif ditugaskan kepada NEGERI saya
                { assignedState: user.state }, // user.state ialah ID

                // 4. Inisiatif ditugaskan kepada PPD saya
                { assignedPPD: user.ppd } // user.ppd ialah ID
            ]
        };

        // Buang tapisan null (jika pengguna tiada state/ppd)
        // Cth: Jika 'user.state' ialah null, kita tak mahu cari { assignedState: null }
        filter.$or = filter.$or.filter(condition => {
            if (condition.assignees) return true;
            if (condition.assignedRole && user.role) return true;
            if (condition.assignedState && user.state) return true;
            if (condition.assignedPPD && user.ppd) return true;
            return false;
        });

        console.log('Mencari inisiatif dengan tapisan:', JSON.stringify(filter, null, 2));

        const initiatives = await Initiative.find(filter)
            .populate('strategy', 'name')
            .populate('assignees', 'firstName lastName email')
            .populate('assignedState', 'name') // Populate nama untuk paparan
            .populate('assignedPPD', 'name')   // Populate nama untuk paparan
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
        const users = await User.find()
            .select('-password')
            .populate('state', 'name') // ✅ TAMBAHAN: Ambil nama Negeri
            .populate('ppd', 'name')   // ✅ TAMBAHAN: Ambil nama PPD
            .sort({ createdAt: -1 });  // Susun user paling baru di atas

        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: 'Server error fetching users.' });
    }
});

// --- GET /api/users/assignable --- (Nama route ditukar supaya lebih jelas)
// Gets a list of users who can be assigned to initiatives. (Admin Only)
router.get('/assignable', [auth, adminAuth], async (req, res) => {
    try {
        // Ambil semua pengguna yang BUKAN Super Admin
        const assignableUsers = await User.find({
            role: { $ne: 'Admin' }
        })
            .populate('state', 'name') // Dapatkan nama Negeri
            .populate('ppd', 'name')   // Dapatkan nama PPD
            .select('id firstName lastName role state ppd department')
            .sort({ role: 1, state: 1, ppd: 1, firstName: 1 }); // Susun ikut hierarki

        // Format nama pengguna supaya lebih informatif di dropdown
        const formattedUsers = assignableUsers.map(user => {
            let location = '';
            if (user.role === 'Negeri' && user.state) {
                location = `(${user.state.name})`;
            } else if (user.role === 'PPD' && user.ppd) {
                location = `(${user.ppd.name})`;
            } else if (user.role === 'Bahagian' && user.department) {
                location = `(${user.department})`;
            }

            return {
                _id: user._id,
                // Gabungkan nama dan lokasi
                displayName: `${user.firstName} ${user.lastName} ${location}`.trim()
            };
        });

        res.json(formattedUsers);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching assignable users.' });
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
        const { firstName, lastName, email, role, password, department, state, ppd, status } = req.body;

        const updatedData = { firstName, lastName, email, role, department, state, ppd, status };

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updatedData.password = await bcrypt.hash(password, salt);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updatedData }, // Gunakan $set untuk kemaskini yang lebih selamat
            { new: true }
        ).select('-password');

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