import mongoose from 'mongoose';

const updateSchema = new mongoose.Schema(
  {
    applicationId: mongoose.Schema.Types.ObjectId,
    company:       String,
    jobTitle:      String,
    oldStatus:     String,
    newStatus:     String,
    emailSubject:  String,
    emailFrom:     String,
    detectedAt:    { type: Date, default: Date.now },
  },
  { _id: false },
);

const gmailTokenSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    email:        { type: String, required: true },
    // AES-256-GCM encrypted tokens (same key as portal credentials)
    accessToken:  { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiryDate:   { type: Number, default: 0 },

    lastSyncAt:      { type: Date, default: null },
    lastSyncUpdates: { type: [updateSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model('GmailToken', gmailTokenSchema);
