import Joi from 'joi';

const PORTALS = ['naukri'];

export const saveCredentialsSchema = Joi.object({
  portal:   Joi.string().valid(...PORTALS).required(),
  username: Joi.string().min(3).max(200).required(),
  // Password is validated in the controller (Naukri requires it, Indeed/Google OAuth does not).
  // Joi.when() with abortEarly:false evaluates both branches, causing false errors here.
  password: Joi.string().allow('').max(200).optional().default(''),
  preferences: Joi.object({
    noticePeriodDays:  Joi.number().integer().min(0).max(180).default(30),
    currentCtcLakhs:   Joi.number().min(0).max(999).default(0),
    expectedCtcLakhs:  Joi.number().min(0).max(999).default(0),
    coverNote:         Joi.string().allow('').max(1000).default(''),
    yearsOfExperience: Joi.number().integer().min(0).max(60).default(0),
  }).default({}),
});

export const triggerAutoApplySchema = Joi.object({
  portal:    Joi.string().valid(...PORTALS).required(),
  resumeId:  Joi.string().hex().length(24).required(),
  keywords:  Joi.string().min(1).max(200).required(),
  location:  Joi.string().allow('').max(100).default(''),
  maxJobs:   Joi.number().integer().min(1).max(50).default(10),
  freshness: Joi.number().integer().valid(0, 1, 3, 7, 15, 30).default(0),
});
