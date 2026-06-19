import mongoose from 'mongoose';
import User from '../../models/User.js';
import ApiError from '../../utils/ApiError.js';
import { uploadFile } from '../../middleware/upload.js';

// ─── Get Profile ──────────────────────────────────────────────────────────────
export const getProfileService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

// ─── Update Profile ───────────────────────────────────────────────────────────
export const updateProfileService = async (userId, { name, profile }) => {
  const update = {};

  if (name !== undefined) update.name = name;

  // Use dot-notation to avoid overwriting sibling profile fields
  if (profile) {
    Object.entries(profile).forEach(([key, val]) => {
      update[`profile.${key}`] = val;
    });
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true, runValidators: true },
  );

  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

// ─── Update Skills ────────────────────────────────────────────────────────────
export const updateSkillsService = async (userId, skills) => {
  // Deduplicate and normalize
  const normalised = [...new Set(skills.map((s) => s.trim().toLowerCase()))];

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { skills: normalised } },
    { new: true },
  );

  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

// ─── Add Experience ───────────────────────────────────────────────────────────
export const addExperienceService = async (userId, expData) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $push: { experience: { $each: [expData], $position: 0 } } }, // newest first
    { new: true, runValidators: true },
  );

  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

// ─── Update Experience ────────────────────────────────────────────────────────
export const updateExperienceService = async (userId, expId, expData) => {
  if (!mongoose.Types.ObjectId.isValid(expId)) {
    throw new ApiError(400, 'Invalid experience ID');
  }

  // Build positional update using arrayFilters
  const updateFields = {};
  Object.entries(expData).forEach(([key, val]) => {
    updateFields[`experience.$[exp].${key}`] = val;
  });

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    {
      new: true,
      arrayFilters: [{ 'exp._id': new mongoose.Types.ObjectId(expId) }],
      runValidators: true,
    },
  );

  if (!user) throw new ApiError(404, 'User not found');

  const exists = user.experience.some((e) => e._id.toString() === expId);
  if (!exists) throw new ApiError(404, 'Experience entry not found');

  return user;
};

// ─── Delete Experience ────────────────────────────────────────────────────────
export const deleteExperienceService = async (userId, expId) => {
  if (!mongoose.Types.ObjectId.isValid(expId)) {
    throw new ApiError(400, 'Invalid experience ID');
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { experience: { _id: new mongoose.Types.ObjectId(expId) } } },
    { new: true },
  );

  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

// ─── Update Preferences ───────────────────────────────────────────────────────
export const updatePreferencesService = async (userId, prefs) => {
  // Build a partial merge — only supplied fields are changed
  const update = {};
  Object.entries(prefs).forEach(([key, val]) => {
    if (key === 'notifications' && typeof val === 'object') {
      Object.entries(val).forEach(([nKey, nVal]) => {
        update[`preferences.notifications.${nKey}`] = nVal;
      });
    } else {
      update[`preferences.${key}`] = val;
    }
  });

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true, runValidators: true },
  );

  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

// ─── Add Education ────────────────────────────────────────────────────────────
export const addEducationService = async (userId, eduData) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $push: { education: { $each: [eduData], $position: 0 } } },
    { new: true, runValidators: true },
  );
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

// ─── Update Education ─────────────────────────────────────────────────────────
export const updateEducationService = async (userId, eduId, eduData) => {
  if (!mongoose.Types.ObjectId.isValid(eduId)) throw new ApiError(400, 'Invalid education ID');

  const updateFields = {};
  Object.entries(eduData).forEach(([key, val]) => {
    updateFields[`education.$[edu].${key}`] = val;
  });

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updateFields },
    {
      new: true,
      arrayFilters: [{ 'edu._id': new mongoose.Types.ObjectId(eduId) }],
      runValidators: true,
    },
  );
  if (!user) throw new ApiError(404, 'User not found');
  const exists = user.education.some((e) => e._id.toString() === eduId);
  if (!exists) throw new ApiError(404, 'Education entry not found');
  return user;
};

// ─── Delete Education ─────────────────────────────────────────────────────────
export const deleteEducationService = async (userId, eduId) => {
  if (!mongoose.Types.ObjectId.isValid(eduId)) throw new ApiError(400, 'Invalid education ID');

  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { education: { _id: new mongoose.Types.ObjectId(eduId) } } },
    { new: true },
  );
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

// ─── Upload Avatar ────────────────────────────────────────────────────────────
export const uploadAvatarService = async (userId, fileBuffer, mimetype) => {
  const result = await uploadFile(fileBuffer, {
    folder: 'careersync/avatars',
    public_id: `avatar_${userId}`,
    resource_type: 'image',
    mimetype,
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
    overwrite: true,
  });

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { 'profile.avatar': result.secure_url } },
    { new: true },
  );

  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

// ─── Delete Avatar ────────────────────────────────────────────────────────────
export const deleteAvatarService = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $unset: { 'profile.avatar': 1 } },
    { new: true },
  );

  if (!user) throw new ApiError(404, 'User not found');
  return user;
};
