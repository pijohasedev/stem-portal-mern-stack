const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Initiative = require('../models/initiative.model');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const ActivityLog = require('../models/ActivityLog'); // Pastikan model ini wujud

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

        // ✅ 1. Update Last Login User
        user.lastLogin = new Date();
        user.lastIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await user.save();

        // ✅ 2. Simpan Audit Trail (DIBETULKAN: Guna Try-Catch)
        // Ini memastikan login tidak gagal walaupun log gagal disimpan.
        try {
            await ActivityLog.create({
                user: user._id,
                action: 'LOGIN',
                description: `${user.email} telah log masuk.`,
                ip: user.lastIp,
                userAgent: req.headers['user-agent']
            });
        } catch (logError) {
            console.error("Gagal mencipta ActivityLog (Login diteruskan):", logError);
        }

        // 3. Check if the user's account is suspended
        if (user.status === 'Suspended') {
            return res.status(403).json({ message: 'Your account has been suspended. Please contact an administrator.' });
        }

        // 4. If all checks pass, create and send the token
        const payload = { user: { id: user.id, role: user.role } };

        // Disarankan guna process.env.JWT_SECRET untuk production
        const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;

                // Hantar objek user yang lengkap
                res.json({
                    token,
                    user: {
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        role: user.role,
                        department: user.department,
                        state: user.state,
                        ppd: user.ppd,
                        mustChangePassword: user.mustChangePassword
                    }
                });
            }
        );

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// --- POST /api/users/change-password ---
// User menukar kata laluan sendiri. (Authenticated User)
router.post('/change-password', auth, async (req, res) => {
    try {
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: "Kata laluan mesti sekurang-kurangnya 6 aksara." });
        }

        // 1. Hash password baru
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 2. Update User: Set password baru & matikan flag mustChangePassword
        await User.findByIdAndUpdate(req.user.id, {
            password: hashedPassword,
            mustChangePassword: false
        });

        res.json({ message: "Kata laluan berjaya ditukar. Sila log masuk semula." });
    } catch (err) {
        console.error("Change Password Error:", err.message);
        res.status(500).json({ message: "Server error while changing password." });
    }
});

// --- POST /api/users/:id/reset-password ---
// Admin reset password pengguna lain ke default. (Admin Only)
router.post('/:id/reset-password', [auth, adminAuth], async (req, res) => {
    try {
        // 1. Cipta hash untuk password default "STEM@Password1"
        const salt = await bcrypt.genSalt(10);
        const defaultPassword = await bcrypt.hash("STEM@Password1", salt);

        // 2. Update user: Reset password & Hidupkan flag mustChangePassword
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            {
                password: defaultPassword,
                mustChangePassword: true
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found." });
        }

        res.json({ message: `Kata laluan untuk ${updatedUser.email} telah di-reset kepada: STEM@Password1` });
    } catch (err) {
        console.error("Reset Password Error:", err.message);
        res.status(500).json({ message: "Server error while resetting password." });
    }
});

// --- GET /api/users/me ---
// Get current user profile
router.get('/me', auth, async (req, res) => {
    try {
        const userId = req.user.id;

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

// --- GET /api/users/me/initiatives ---
// Get current user's initiatives
router.get('/me/initiatives', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = req.user;

        console.log(`=== Fetching initiatives for user ${user.email} (Role: ${user.role}) ===`);

        const filter = {
            $or: [
                { assignees: userId },
                { assignedRole: user.role },
                { assignedState: user.state },
                { assignedPPD: user.ppd }
            ]
        };

        // Bersihkan filter
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
            .populate('assignedState', 'name')
            .populate('assignedPPD', 'name')
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
            .populate('state', 'name')
            .populate('ppd', 'name')
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: 'Server error fetching users.' });
    }
});

// --- GET /api/users/assignable ---
// Gets a list of users who can be assigned to initiatives. (Admin Only)
router.get('/assignable', [auth, adminAuth], async (req, res) => {
    try {
        const assignableUsers = await User.find({
            role: { $ne: 'Admin' }
        })
            .populate('state', 'name')
            .populate('ppd', 'name')
            .select('id firstName lastName role state ppd department')
            .sort({ role: 1, state: 1, ppd: 1, firstName: 1 });

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
            { $set: updatedData },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: 'User updated successfully!', user: updatedUser });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'This email is already in use by another account.' });
        }

        console.error('Update User Error:', error);
        res.status(500).json({ message: 'Server error updating user.' });
    }
});

// PATCH /api/users/:id/suspend
router.patch('/:id/suspend', [auth, adminAuth], async (req, res) => {
    try {
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

// PATCH /api/users/:id/activate
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

// POST /api/users/bulk-suspend
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

// POST /api/users/bulk-activate
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