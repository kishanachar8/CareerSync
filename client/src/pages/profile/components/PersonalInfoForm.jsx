import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, uploadAvatar, resetSaveStatus } from '../../../features/profile/profileSlice.js';
import { showToast } from '../../../features/ui/uiSlice.js';
import { isRejectedWithValue } from '@reduxjs/toolkit';
import FormField from '../../../components/forms/FormField.jsx';
import Button from '../../../components/ui/Button.jsx';
import Card from '../../../components/ui/Card.jsx';
import { Camera, User } from 'lucide-react';

const PersonalInfoForm = () => {
  const dispatch = useDispatch();
  const { data: profile, saveStatus, saveError } = useSelector((s) => s.profile);
  const fileRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm();

  const bioValue = watch('profile.bio') || '';
  const BIO_MAX = 2000;

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      reset({
        name:                profile.name || '',
        'profile.headline':  profile.profile?.headline || '',
        'profile.bio':       profile.profile?.bio || '',
        'profile.location':  profile.profile?.location || '',
        'profile.phone':     profile.profile?.phone || '',
        'profile.website':   profile.profile?.website || '',
        'profile.linkedin':  profile.profile?.linkedin || '',
        'profile.github':    profile.profile?.github || '',
      });
    }
  }, [profile, reset]);

  // Toast only for profile-form saves (not avatar — avatar has its own inline feedback)
  useEffect(() => {
    if (saveStatus === 'succeeded' && !avatarUploading) {
      dispatch(showToast({ message: 'Profile updated successfully', type: 'success' }));
      dispatch(resetSaveStatus());
    }
  }, [saveStatus, dispatch, avatarUploading]);

  const onSubmit = (formData) => {
    // react-hook-form v7 treats 'profile.bio' as a nested path,
    // so formData.profile is already the full nested object.
    dispatch(updateProfile({
      name:    formData.name,
      profile: formData.profile,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);

    const fd = new FormData();
    fd.append('avatar', file);
    dispatch(uploadAvatar(fd)).then((result) => {
      setAvatarUploading(false);
      if (isRejectedWithValue(result)) {
        dispatch(showToast({ message: result.payload || 'Avatar upload failed', type: 'error' }));
        setAvatarPreview(null); // revert preview on failure
      } else {
        dispatch(showToast({ message: 'Avatar updated', type: 'success' }));
      }
      dispatch(resetSaveStatus());
    });
  };

  const avatarSrc = avatarPreview || profile?.profile?.avatar;
  const isSaving = saveStatus === 'loading';

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <Card.Body className="flex items-center gap-6">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center overflow-hidden">
              {avatarUploading ? (
                <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              ) : avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <User size={32} className="text-primary-400" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white shadow hover:bg-primary-700 transition-colors disabled:opacity-50"
              aria-label="Change avatar"
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="font-medium text-ink">{profile?.name}</p>
            <p className="text-sm text-ink-muted mt-0.5">
              JPG, PNG, or WebP · Max 5 MB
            </p>
          </div>
        </Card.Body>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <Card.Header>
            <h3 className="font-medium text-gray-900">Personal Information</h3>
          </Card.Header>
          <Card.Body className="space-y-4">
            {saveError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-lg text-sm text-rose-600 dark:text-rose-300">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Full name"
                error={errors.name}
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'At least 2 characters' },
                  maxLength: { value: 50, message: 'Max 50 characters' },
                })}
              />
              <FormField
                label="Phone"
                type="tel"
                placeholder="+91 98765 43210"
                error={errors['profile.phone']}
                {...register('profile.phone')}
              />
            </div>

            <FormField
              label="Professional headline"
              placeholder="e.g. Senior Software Engineer · React · Node.js · 4 years exp"
              error={errors['profile.headline']}
              {...register('profile.headline', {
                maxLength: { value: 120, message: 'Max 120 characters' },
              })}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                rows={5}
                placeholder="Describe your professional background, key skills, what you're looking for…"
                className={[
                  'w-full px-3 py-2 border rounded-lg text-sm transition-colors resize-y text-ink bg-elevated-2',
                  'placeholder:text-ink-muted',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                  errors['profile.bio']
                    ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/20 focus:ring-rose-400'
                    : 'border-line',
                ].join(' ')}
                {...register('profile.bio', {
                  maxLength: { value: BIO_MAX, message: `Max ${BIO_MAX} characters` },
                })}
              />
              <div className="flex items-center justify-between mt-1">
                {errors['profile.bio'] ? (
                  <p className="text-xs text-red-500">{errors['profile.bio'].message}</p>
                ) : (
                  <span />
                )}
                <span className={`text-xs ${bioValue.length > BIO_MAX * 0.9 ? 'text-amber-500' : 'text-ink-muted/70'}`}>
                  {bioValue.length} / {BIO_MAX}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Location"
                placeholder="City, Country"
                error={errors['profile.location']}
                {...register('profile.location')}
              />
              <FormField
                label="Website"
                type="url"
                placeholder="https://yourwebsite.com"
                error={errors['profile.website']}
                {...register('profile.website')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="LinkedIn"
                type="url"
                placeholder="https://linkedin.com/in/you"
                error={errors['profile.linkedin']}
                {...register('profile.linkedin')}
              />
              <FormField
                label="GitHub"
                type="url"
                placeholder="https://github.com/you"
                error={errors['profile.github']}
                {...register('profile.github')}
              />
            </div>
          </Card.Body>
          <Card.Footer className="flex justify-end">
            <Button type="submit" loading={isSaving} disabled={!isDirty}>
              Save changes
            </Button>
          </Card.Footer>
        </Card>
      </form>
    </div>
  );
};

export default PersonalInfoForm;
