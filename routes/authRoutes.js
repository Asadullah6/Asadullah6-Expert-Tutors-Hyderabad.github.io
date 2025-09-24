const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Mentor = require('../models/Mentor');
const bcrypt = require('bcrypt');

// Show login form
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// Show register form
router.get('/register', (req, res) => {
  res.render('auth/signup');
});

// Handle registration
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error', 'Email already in use.');
      return res.redirect('/auth/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();

    req.flash('success', '✅ Registration successful! Please log in.');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Registration Error:', err);
    req.flash('error', 'Could not register. Try again.');
    res.redirect('/auth/register');
  }
});

// Handle login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'Invalid credentials.');
      return res.redirect('/auth/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error', 'Invalid credentials.');
      return res.redirect('/auth/login');
    }

    // ✅ Save only ID and role to session (safe)
    req.session.userId = user._id;
    req.session.userRole = user.role;

    // Auto-create Mentor profile if needed
    if (user.role === 'mentor') {
      let mentor = await Mentor.findOne({ user: user._id });
      if (!mentor) {
        mentor = new Mentor({
          user: user._id,
          skills: [],
          bio: 'Available for sessions',
          experience: 0,
          hourlyRate: 0
        });
        await mentor.save();
      }
    }

    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect('/auth/login');
      }
      res.redirect(user.role === 'student' ? '/dashboard/student' : '/dashboard/mentor');
    });
  } catch (err) {
    console.error('Login Error:', err);
    req.flash('error', 'Could not log in.');
    res.redirect('/auth/login');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;