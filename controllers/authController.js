const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../utils/database');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'hydronexus_secret_key',
    { expiresIn: '7d' }
  );
};

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, email, password, profile } = req.body;

    // Check if user exists
    const existingUser = db.users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = {
      _id: 'user' + Date.now(),
      username, email,
      password: hashedPassword,
      role: 'citizen',
      profile: profile || {},
      preferences: { notifications: { email: true, push: true } },
      isActive: true,
      createdAt: new Date()
    };

    db.users.push(user);
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user: { id: user._id, username: user.username, email: user.email, role: user.role }, token }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = db.users.find(u => u.email === email);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: { user: { id: user._id, username: user.username, email: user.email, role: user.role, profile: user.profile }, token }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

// Get profile
exports.getProfile = async (req, res) => {
  const user = db.users.find(u => u._id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  
  res.json({
    success: true,
    data: { user: { id: user._id, username: user.username, email: user.email, role: user.role, profile: user.profile, preferences: user.preferences } }
  });
};

// Update profile
exports.updateProfile = async (req, res) => {
  const user = db.users.find(u => u._id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  
  if (req.body.profile) Object.assign(user.profile, req.body.profile);
  if (req.body.preferences) Object.assign(user.preferences, req.body.preferences);
  
  res.json({ success: true, message: 'Profile updated', data: { user } });
};

// Change password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.users.find(u => u._id === req.user.id);
  
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
  
  user.password = await bcrypt.hash(newPassword, 12);
  res.json({ success: true, message: 'Password changed successfully' });
};

exports.logout = (req, res) => res.json({ success: true, message: 'Logged out successfully' });

exports.verifyToken = (req, res) => {
  const user = db.users.find(u => u._id === req.user.id);
  if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid token' });
  res.json({ success: true, data: { user: { id: user._id, username: user.username, email: user.email, role: user.role } } });
};
