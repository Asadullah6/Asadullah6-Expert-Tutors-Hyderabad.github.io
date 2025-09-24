const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Mentor = require('../models/Mentor');
const Session = require('../models/Session');

// Middleware: Check if user is logged in
function ensureAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

// Home page
router.get('/', (req, res) => {
  res.render('index');
});

// Use auth routes
router.use('/auth', require('./authRoutes'));

router.get('/dashboard/student', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'student') {
    return res.redirect('/dashboard/mentor');
  }
  const sessions = await Session.find({ student: req.session.userId })
    .populate('mentor', 'name email location');  // mentor -> User directly
  res.render('dashboard/student', { sessions });
});
// Mentor Dashboard
router.get('/dashboard/mentor', ensureAuthenticated, async (req, res) => {
  try {
    const mentor = await Mentor.findOne({ user: req.session.userId });
    const sessions = await Session.find({ mentor: mentor._id }).populate('student', 'name');

    // ✅ Pass both variables
    res.render('dashboard/mentor', { 
      sessions,
      mentor 
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    req.flash('error', 'Could not load dashboard.');
    res.redirect('/auth/login');
  }
});

// 🔥 Find Mentors
router.get('/mentors', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'student') {
    return res.redirect('/dashboard/student');
  }
  const mentors = await Mentor.find().populate('user', 'name email location');
  res.render('mentors/list', { mentors });
});

// Show booking form
router.get('/book/:userId', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'student') {
    return res.redirect('/auth/login');
  }
  const user = await User.findById(req.params.userId);
  const mentor = await Mentor.findOne({ user: user._id });
  res.render('mentors/book', { mentor });
});

// Handle booking submission
router.post('/book/:userId', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'student') {
    return res.redirect('/auth/login');
  }

  const { subject, date, time, notes } = req.body;
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    const mentor = await Mentor.findOne({ user: user._id });

    const session = new Session({
      student: req.session.userId,
      mentor: mentor._id,
      subject,
      date,
      time,
      notes,
      status: 'pending'
    });

    await session.save();
    req.flash('success', `✅ Session booked with ${user.name}!`);
    res.redirect('/dashboard/student');
  } catch (err) {
    console.error('Booking Error:', err);
    req.flash('error', 'Could not book session.');
    res.redirect(`/book/${userId}`);
  }
});

// Show student's sessions - CORRECTED & WORKING
router.get('/sessions', ensureAuthenticated, async (req, res) => {
  try {
    // ✅ Populate 'mentor' as direct reference to User (since ref: 'User')
    const sessions = await Session.find({ student: req.session.userId })
      .populate('mentor', 'name email'); // 'name' comes from User model

    res.render('dashboard/sessions', { sessions });
  } catch (err) {
    console.error('Load Sessions Error:', err);
    req.flash('error', 'Could not load your sessions.');
    res.redirect('/dashboard/student');
  }
});

// Edit session form
router.get('/session/edit/:id', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'student') return res.redirect('/auth/login');

  const session = await Session.findById(req.params.id);
  if (!session || session.student.toString() !== req.session.userId) {
    req.flash('error', 'Access denied.');
    return res.redirect('/sessions');
  }

  res.render('dashboard/edit-session', { session });
});

// Update session
router.post('/session/edit/:id', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'student') return res.redirect('/auth/login');

  const { subject, date, time, notes } = req.body;
  const session = await Session.findById(req.params.id);

  if (!session || session.student.toString() !== req.session.userId) {
    req.flash('error', 'Access denied.');
    return res.redirect('/sessions');
  }

  session.subject = subject;
  session.date = date;
  session.time = time;
  session.notes = notes;

  await session.save();
  req.flash('success', 'Session updated!');
  res.redirect('/sessions');
});

// Delete session
router.get('/session/delete/:id', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'student') return res.redirect('/auth/login');

  const session = await Session.findById(req.params.id);
  if (!session || session.student.toString() !== req.session.userId) {
    req.flash('error', 'Access denied.');
    return res.redirect('/sessions');
  }

  await session.deleteOne();
  req.flash('success', 'Session deleted.');
  res.redirect('/sessions');
});

// Mentor: View bookings
router.get('/my-bookings', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'mentor') return res.redirect('/auth/login');

  const mentor = await Mentor.findOne({ user: req.session.userId });
  const sessions = await Session.find({ mentor: mentor._id }).populate('student', 'name');

  res.render('dashboard/my-bookings', { sessions });
});

// Accept session - FIXED VERSION
router.get('/session/accept/:id', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'mentor') return res.redirect('/auth/login');

  try {
    const mentor = await Mentor.findOne({ user: req.session.userId });
    const session = await Session.findById(req.params.id);
    
    if (!session || session.mentor.toString() !== mentor._id.toString()) {
      req.flash('error', 'Access denied.');
      return res.redirect('/my-bookings');
    }

    session.status = 'confirmed';
    await session.save();
    req.flash('success', 'Session accepted!');
    res.redirect('/my-bookings');
  } catch (err) {
    console.error('Accept session error:', err);
    req.flash('error', 'Error accepting session.');
    res.redirect('/my-bookings');
  }
});

// Reject session - CORRECTED VERSION
router.get('/session/reject/:id', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'mentor') return res.redirect('/auth/login');

  try {
    const mentor = await Mentor.findOne({ user: req.session.userId });
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      req.flash('error', 'Session not found.');
      return res.redirect('/my-bookings');
    }
    
    if (session.mentor.toString() !== mentor._id.toString()) {
      req.flash('error', 'Access denied.');
      return res.redirect('/my-bookings');
    }

    session.status = 'rejected';  // Changed from 'canceled' to 'rejected'
    await session.save();
    req.flash('success', 'Session rejected.');
    res.redirect('/my-bookings');
  } catch (err) {
    console.error('Reject session error:', err);
    req.flash('error', 'Error rejecting session.');
    res.redirect('/my-bookings');
  }
});
// ✅ Show edit profile form
router.get('/mentor/profile/edit', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'mentor') {
    return res.redirect('/auth/login');
  }

  const mentor = await Mentor.findOne({ user: req.session.userId });
  res.render('dashboard/edit-profile', { mentor });
});

// ✅ Save mentor profile
router.post('/mentor/profile', ensureAuthenticated, async (req, res) => {
  if (req.session.userRole !== 'mentor') {
    return res.redirect('/auth/login');
  }

  const { skills, bio, experience, hourlyRate, github, linkedin } = req.body;
  const skillList = skills.split(',').map(s => s.trim()).filter(s => s);

  let mentor = await Mentor.findOne({ user: req.session.userId });

  if (!mentor) {
    // Create new profile
    mentor = new Mentor({
      user: req.session.userId,
      skills: skillList,
      bio,
      experience: Number(experience) || 0,
      hourlyRate: Number(hourlyRate) || 0,
      github: github || '',
      linkedin: linkedin || ''
    });
    req.flash('success', '✅ Profile created!');
  } else {
    // Update existing
    mentor.skills = skillList;
    mentor.bio = bio;
    mentor.experience = Number(experience) || 0;
    mentor.hourlyRate = Number(hourlyRate) || 0;
    mentor.github = github || '';
    mentor.linkedin = linkedin || '';
    req.flash('success', '✅ Profile updated!');
  }

  await mentor.save();
  res.redirect('/dashboard/mentor');
});
// Remove the import and add this function directly in sessions.js
function ensureAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}
module.exports = router;