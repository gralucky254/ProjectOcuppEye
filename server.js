require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { body, validationResult } = require('express-validator');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Initialize Express app
const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "cdnjs.cloudflare.com",
        "unpkg.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "cdnjs.cloudflare.com",
        "fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "res.cloudinary.com",
        "*.tile.openstreetmap.org"  // For Leaflet map tiles
      ],
      fontSrc: [
        "'self'",
        "cdnjs.cloudflare.com",
        "fonts.gstatic.com",
        "fonts.googleapis.com"
      ],
      connectSrc: [
        "'self'",
        "http://localhost:5000",
        "ws://localhost:5000",
        "http://10.0.0.51:5000",
        "ws://10.0.0.51:5000"
      ],
      objectSrc: ["'none'"],
      childSrc: ["'none'"],
      frameSrc: ["'none'"]
    }
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Essential Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/occuppeye", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => {
  console.error("❌ MongoDB Connection Error:", err);
  process.exit(1);
});

// User Model
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String },
  avatar: { type: String },
  password: { type: String, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// JWT Configuration
const jwtSecret = process.env.JWT_SECRET || "default_secret_key";
const tokenExpiry = process.env.TOKEN_EXPIRY || "1h";

// Authentication Middleware
const authenticateUser = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// File Upload Configuration for profile photos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Passport Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = new User({
        googleId: profile.id,
        fullName: profile.displayName,
        email: profile.emails[0].value,
        authMethod: 'google'
      });
      await user.save();
    }
    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Initialize Passport and Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret_key',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Routes

// Google authentication route
app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// Google callback route
app.get('/auth/google/callback', passport.authenticate('google', {
  failureRedirect: '/',
  session: false
}), (req, res) => {
  // Generate JWT for the authenticated user
  const token = jwt.sign(
    { id: req.user._id, email: req.user.email },
    jwtSecret,
    { expiresIn: tokenExpiry }
  );

  // Send the token back to the frontend (in a cookie or response)
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000'); // Redirect to the frontend
});

// Login Route (returns only name and phone number)
app.post('/login', [
  body('username').trim().notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { username, password } = req.body;
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      jwtSecret,
      { expiresIn: tokenExpiry }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Profile Route (returns only name and phone number)
// In your Express server file (app.js or server.js)

// Get current user profile
app.get('/api/profile', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user profile
app.put('/api/profile', authenticateUser, [
  body('fullName').trim().notEmpty(),
  body('phoneNumber').optional().trim(),
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { fullName, phoneNumber, email } = req.body;
    
    // Check if email is already taken by another user
    const emailExists = await User.findOne({ email, _id: { $ne: req.user.id } });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { fullName, phoneNumber, email },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// Update profile picture
app.post('/api/profile/avatar', authenticateUser, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Upload to Cloudinary or save locally
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'profile-avatars',
      width: 200,
      height: 200,
      crop: 'fill'
    });

    // Update user in database
    await User.findByIdAndUpdate(req.user.id, { avatar: result.secure_url });

    res.json({ success: true, avatarUrl: result.secure_url });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Avatar upload failed' });
  }
});
// Logout Route
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
