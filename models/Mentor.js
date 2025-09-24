const mongoose = require('mongoose');

const mentorSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  skills: [String],
  bio: String,
  experience: Number,
  hourlyRate: Number
});

module.exports = mongoose.model('Mentor', mentorSchema);