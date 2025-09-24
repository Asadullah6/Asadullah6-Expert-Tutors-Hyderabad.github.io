const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const Mentor = require('../models/Mentor');
const User = require('../models/User');

// Middleware: Check if user is logged in (matching your index.js pattern)
function ensureAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

// Accept a session request
router.get('/accept/:id', ensureAuthenticated, async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    // Get the current mentor
    const mentor = await Mentor.findOne({ user: req.session.userId });
    if (!mentor) {
      req.flash('error', 'Mentor profile not found');
      return res.redirect('/my-bookings');
    }
    
    // Find and update the session
    const session = await Session.findById(sessionId).populate('student');
    
    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/my-bookings');
    }
    
    // Check if the current user is the mentor for this session
    if (session.mentor.toString() !== mentor._id.toString()) {
      req.flash('error', 'Unauthorized access');
      return res.redirect('/my-bookings');
    }
    
    // Update session status to confirmed
    session.status = 'confirmed';
    session.acceptedAt = new Date();
    await session.save();
    
    // Redirect back to bookings with success message
    req.flash('success', 'Session request accepted successfully!');
    res.redirect('/my-bookings');
    
  } catch (error) {
    console.error('Error accepting session:', error);
    req.flash('error', 'Error accepting session request');
    res.redirect('/my-bookings');
  }
});

// Reject a session request
router.get('/reject/:id', ensureAuthenticated, async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    // Get the current mentor
    const mentor = await Mentor.findOne({ user: req.session.userId });
    if (!mentor) {
      req.flash('error', 'Mentor profile not found');
      return res.redirect('/my-bookings');
    }
    
    const session = await Session.findById(sessionId).populate('student');
    
    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/my-bookings');
    }
    
    // Check if the current user is the mentor for this session
    if (session.mentor.toString() !== mentor._id.toString()) {
      req.flash('error', 'Unauthorized access');
      return res.redirect('/my-bookings');
    }
    
    // Update session status to rejected
    session.status = 'rejected';
    session.rejectedAt = new Date();
    await session.save();
    
    req.flash('success', 'Session request rejected');
    res.redirect('/my-bookings');
    
  } catch (error) {
    console.error('Error rejecting session:', error);
    req.flash('error', 'Error rejecting session request');
    res.redirect('/my-bookings');
  }
});

// Show reschedule form
router.get('/reschedule/:id', ensureAuthenticated, async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    // Get the current mentor
    const mentor = await Mentor.findOne({ user: req.session.userId });
    if (!mentor) {
      req.flash('error', 'Mentor profile not found');
      return res.redirect('/my-bookings');
    }
    
    const session = await Session.findById(sessionId).populate('student');
    
    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/my-bookings');
    }
    
    // Check if the current user is the mentor for this session
    if (session.mentor.toString() !== mentor._id.toString()) {
      req.flash('error', 'Unauthorized access');
      return res.redirect('/my-bookings');
    }
    
    // Get user data for template
    const user = await User.findById(req.session.userId);
    
    res.render('dashboard/reschedule-session', { 
      session,
      user,
      title: 'Reschedule Session'
    });
    
  } catch (error) {
    console.error('Error loading reschedule page:', error);
    req.flash('error', 'Error loading reschedule page');
    res.redirect('/my-bookings');
  }
});

// Handle reschedule form submission
router.post('/reschedule/:id', ensureAuthenticated, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { date, time, reason } = req.body;
    
    // Get the current mentor
    const mentor = await Mentor.findOne({ user: req.session.userId });
    if (!mentor) {
      req.flash('error', 'Mentor profile not found');
      return res.redirect('/my-bookings');
    }
    
    const session = await Session.findById(sessionId);
    
    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/my-bookings');
    }
    
    // Check if the current user is the mentor for this session
    if (session.mentor.toString() !== mentor._id.toString()) {
      req.flash('error', 'Unauthorized access');
      return res.redirect('/my-bookings');
    }
    
    // Update session with new date and time
    session.date = date;
    session.time = time;
    session.rescheduledAt = new Date();
    session.rescheduleReason = reason;
    session.status = 'confirmed'; // Keep it confirmed after reschedule
    
    await session.save();
    
    req.flash('success', 'Session rescheduled successfully!');
    res.redirect('/my-bookings');
    
  } catch (error) {
    console.error('Error rescheduling session:', error);
    req.flash('error', 'Error rescheduling session');
    res.redirect('/my-bookings');
  }
});

// Mark session as complete - SHOW FORM
router.get('/complete/:id', ensureAuthenticated, async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    // Get the current mentor
    const mentor = await Mentor.findOne({ user: req.session.userId });
    if (!mentor) {
      req.flash('error', 'Mentor profile not found');
      return res.redirect('/my-bookings');
    }
    
    const session = await Session.findById(sessionId).populate('student');
    
    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/my-bookings');
    }
    
    // Check if the current user is the mentor for this session
    if (session.mentor.toString() !== mentor._id.toString()) {
      req.flash('error', 'Unauthorized access');
      return res.redirect('/my-bookings');
    }
    
    // Get user data for template
    const user = await User.findById(req.session.userId);
    
    res.render('dashboard/complete-session', { 
      session,
      user,
      title: 'Complete Session'
    });
    
  } catch (error) {
    console.error('Error loading complete page:', error);
    req.flash('error', 'Error loading complete page');
    res.redirect('/my-bookings');
  }
});

// Handle session completion - FORM SUBMISSION
router.post('/complete/:id', ensureAuthenticated, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const { notes, duration, topics_covered } = req.body;
    
    // Get the current mentor
    const mentor = await Mentor.findOne({ user: req.session.userId });
    if (!mentor) {
      req.flash('error', 'Mentor profile not found');
      return res.redirect('/my-bookings');
    }
    
    const session = await Session.findById(sessionId);
    
    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/my-bookings');
    }
    
    // Check if the current user is the mentor for this session
    if (session.mentor.toString() !== mentor._id.toString()) {
      req.flash('error', 'Unauthorized access');
      return res.redirect('/my-bookings');
    }
    
    // Update session as completed
    session.status = 'completed';
    session.completedAt = new Date();
    session.notes = notes;
    session.duration = duration;
    session.topicsCovered = topics_covered;
    
    await session.save();
    
    req.flash('success', 'Session marked as completed!');
    res.redirect('/my-bookings');
    
  } catch (error) {
    console.error('Error completing session:', error);
    req.flash('error', 'Error completing session');
    res.redirect('/my-bookings');
  }
});

// View session feedback
router.get('/feedback/:id', ensureAuthenticated, async (req, res) => {
  try {
    const sessionId = req.params.id;
    
    // Get the current mentor
    const mentor = await Mentor.findOne({ user: req.session.userId });
    if (!mentor) {
      req.flash('error', 'Mentor profile not found');
      return res.redirect('/my-bookings');
    }
    
    const session = await Session.findById(sessionId).populate('student');
    
    if (!session) {
      req.flash('error', 'Session not found');
      return res.redirect('/my-bookings');
    }
    
    // Check if the current user is the mentor for this session
    if (session.mentor.toString() !== mentor._id.toString()) {
      req.flash('error', 'Unauthorized access');
      return res.redirect('/my-bookings');
    }
    
    // Get user data for template
    const user = await User.findById(req.session.userId);
    
    res.render('dashboard/session-feedback', { 
      session,
      user,
      title: 'Session Feedback'
    });
    
  } catch (error) {
    console.error('Error loading feedback page:', error);
    req.flash('error', 'Error loading feedback page');
    res.redirect('/my-bookings');
  }
});

module.exports = router;