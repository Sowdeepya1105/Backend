const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    commentId: {
      type: String,
      required: true,
      unique: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Comment', commentSchema);
