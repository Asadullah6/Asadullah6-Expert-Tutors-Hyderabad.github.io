require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const sessionRoutes = require('./routes/sessions');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ DB Connected'))
  .catch(err => console.error('❌ DB Error:', err));

// View engine
app.engine('ejs', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views'); // Explicitly set views directory

// Static files
app.use(express.static('public'));

// Form data parsing
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Flash messages
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(flash());

// Make user & messages available in all views
app.use(async (req, res, next) => {
  res.locals.messages = {
    success: req.flash('success'),
    error: req.flash('error')
  };

  // ✅ Rebuild user from session ID
  if (req.session.userId) {
    try {
      const User = require('./models/User');
      const user = await User.findById(req.session.userId).select('name email role _id');
      res.locals.user = user || null;
    } catch (err) {
      console.error('Failed to load user:', err);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }

  next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/session', sessionRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).send(`
    <h2>Page Not Found: ${req.url}</h2>
    <a href="/">← Go Home</a>
  `);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for Vercel
module.exports = app;