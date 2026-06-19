import mongoose from 'mongoose';
import { APPLICATION_STATUS } from '../constants/index.js';

const { Schema } = mongoose;

const statusHistorySchema = new Schema(
  {
    status:    { type: String, enum: Object.values(APPLICATION_STATUS), required: true },
    changedAt: { type: Date, default: Date.now },
    note:      { type: String, trim: true, maxlength: 500 },
    // 'manual' | 'auto' (bot-applied) | 'gmail_sync'
    source:    { type: String, enum: ['manual', 'auto', 'gmail_sync'], default: 'manual' },
  },
  { _id: false },
);

const applicationSchema = new Schema(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    jobId:    { type: Schema.Types.ObjectId, ref: 'Job',    required: true },
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume' },

    status: {
      type:    String,
      enum:    Object.values(APPLICATION_STATUS),
      default: APPLICATION_STATUS.PENDING,
    },

    // ── Naukri-specific ───────────────────────────────────────────────────────
    // Naukri's internal numeric job ID (extracted from job URL).
    // Stored as a string to be safe against precision loss on large IDs.
    naukriJobId: { type: String, sparse: true },

    // 'platform' = applied directly on Naukri via the bot
    // 'company_site' = "Apply on Company Website" job — routed to manual queue
    applyType: {
      type: String,
      enum: ['platform', 'company_site'],
    },

    // true when the job requires the user to apply on the company's own portal
    manualApply: { type: Boolean, default: false },

    // The company-site URL opened in a new tab for manual completion
    companyApplyUrl: { type: String, default: null },

    // ── Status tracking ───────────────────────────────────────────────────────
    // Full audit trail of every status change
    statusHistory: {
      type:    [statusHistorySchema],
      default: [],
    },

    // Gmail message ID of the email that last triggered a status change
    matchedEmailId: { type: String, default: null },

    // Timestamp of the most recent status change (for efficient "changed since" queries)
    lastStatusUpdate: { type: Date, default: null },

    // ── General ───────────────────────────────────────────────────────────────
    matchScore:  { type: Number, min: 0, max: 100 },
    coverLetter: { type: String },
    notes:       { type: String, trim: true },
    appliedAt:   { type: Date },
    source:      { type: String, enum: ['manual', 'auto'], default: 'manual' },
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1, jobId: 1 },       { unique: true });
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, manualApply: 1 });  // manual-queue filter
applicationSchema.index({ userId: 1, createdAt: -1 });
applicationSchema.index({ naukriJobId: 1 },              { sparse: true });

// ── Pre-save hook: auto-append to statusHistory on status change ───────────
applicationSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  const newStatus = update?.$set?.status;
  if (!newStatus) return;

  const source = update?.$set?.source ?? 'manual';
  const note   = update?.$set?._statusNote ?? null;

  // Remove the helper field before it hits the DB
  if (update.$set?._statusNote !== undefined) delete update.$set._statusNote;

  update.$push = update.$push || {};
  update.$push.statusHistory = {
    status:    newStatus,
    changedAt: new Date(),
    note,
    source,
  };
  update.$set.lastStatusUpdate = new Date();
});

export default mongoose.model('Application', applicationSchema);
