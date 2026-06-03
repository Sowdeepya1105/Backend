const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema(
  {
    issueId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
      lowercase: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['minor', 'major', 'critical'],
      required: true,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'testing', 'resolved', 'closed'],
      required: true,
      lowercase: true,
      trim: true,
      default: 'open',
    },
    dueDate: {
      type: Date,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

issueSchema.index({ project: 1, title: 1 }, { unique: true });

module.exports = mongoose.model('Issue', issueSchema);
