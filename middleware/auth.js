// middleware/auth.js - CORRECTED VERSION
function ensureAuthenticated(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

module.exports = { ensureAuthenticated };