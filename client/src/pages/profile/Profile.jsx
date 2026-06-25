import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile } from '../../features/profile/profileSlice.js';
import Loader from '../../components/common/Loader.jsx';
import PersonalInfoForm from './components/PersonalInfoForm.jsx';
import SkillsManager from './components/SkillsManager.jsx';
import ExperienceManager from './components/ExperienceManager.jsx';
import EducationManager from './components/EducationManager.jsx';
import PreferencesForm from './components/PreferencesForm.jsx';
import {
  User, Star, Briefcase, Settings, GraduationCap,
  MapPin, Phone, Globe, Linkedin, Github, CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Profile Completion ────────────────────────────────────────────────────────

const COMPLETION_STEPS = [
  { key: 'name',       label: 'Full name',         weight: 10, check: (p) => !!p.name },
  { key: 'headline',   label: 'Professional headline', weight: 10, check: (p) => !!p.profile?.headline },
  { key: 'bio',        label: 'Bio',               weight: 10, check: (p) => !!p.profile?.bio },
  { key: 'phone',      label: 'Phone number',      weight: 5,  check: (p) => !!p.profile?.phone },
  { key: 'location',   label: 'Location',          weight: 5,  check: (p) => !!p.profile?.location },
  { key: 'linkedin',   label: 'LinkedIn profile',  weight: 5,  check: (p) => !!p.profile?.linkedin },
  { key: 'avatar',     label: 'Profile photo',     weight: 5,  check: (p) => !!p.profile?.avatar },
  { key: 'skills',     label: '3+ skills',         weight: 15, check: (p) => (p.skills?.length || 0) >= 3 },
  { key: 'experience', label: 'Work experience',   weight: 20, check: (p) => (p.experience?.length || 0) >= 1 },
  { key: 'education',  label: 'Education',         weight: 15, check: (p) => (p.education?.length || 0) >= 1 },
];

function calcCompletion(profile) {
  if (!profile) return { score: 0, missing: [] };
  const missing = [];
  let score = 0;
  for (const step of COMPLETION_STEPS) {
    if (step.check(profile)) {
      score += step.weight;
    } else {
      missing.push(step.label);
    }
  }
  return { score, missing };
}

// ─── Profile Hero ──────────────────────────────────────────────────────────────

const ProfileHero = ({ profile, completion }) => {
  const avatarSrc = profile.profile?.avatar;
  const colorClass =
    completion.score >= 80 ? 'text-green-600 bg-green-50' :
    completion.score >= 50 ? 'text-amber-600 bg-amber-50' :
                             'text-red-600 bg-red-50';
  const barColor =
    completion.score >= 80 ? 'bg-green-500' :
    completion.score >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="bg-elevated rounded-2xl border border-line shadow-sm overflow-hidden">
      {/* Banner */}
      <div className="h-28 bg-gradient-to-r from-primary-600 via-primary-500 to-violet-500" />

      <div className="px-6 pb-5">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-12 mb-4">
          <div className="w-24 h-24 rounded-2xl bg-elevated border-4 border-elevated shadow-md flex items-center justify-center overflow-hidden shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <User size={36} className="text-primary-400" />
            )}
          </div>

          {/* Completion badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${colorClass}`}>
            {completion.score >= 80 && <CheckCircle2 size={14} />}
            {completion.score}% complete
          </div>
        </div>

        {/* Name + headline */}
        <div className="mb-3">
          <h2 className="text-xl font-bold text-ink">{profile.name}</h2>
          {profile.profile?.headline ? (
            <p className="text-sm text-ink-muted mt-0.5">{profile.profile.headline}</p>
          ) : (
            <p className="text-xs text-ink-muted/70 mt-0.5 italic">No headline — add one in Personal Info</p>
          )}
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-3 text-xs text-ink-muted mb-4">
          {profile.profile?.location && (
            <span className="flex items-center gap-1"><MapPin size={12} />{profile.profile.location}</span>
          )}
          {profile.profile?.phone && (
            <span className="flex items-center gap-1"><Phone size={12} />{profile.profile.phone}</span>
          )}
          {profile.profile?.website && (
            <a href={profile.profile.website} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 hover:text-primary-600">
              <Globe size={12} />Website
            </a>
          )}
          {profile.profile?.linkedin && (
            <a href={profile.profile.linkedin} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 hover:text-blue-600">
              <Linkedin size={12} />LinkedIn
            </a>
          )}
          {profile.profile?.github && (
            <a href={profile.profile.github} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1 hover:text-gray-900">
              <Github size={12} />GitHub
            </a>
          )}
        </div>

        {/* Completion bar */}
        <div>
          <div className="flex justify-between text-xs text-ink-muted/70 mb-1">
            <span>Profile strength</span>
            {completion.missing.length > 0 && (
              <span>Add: {completion.missing.slice(0, 2).join(', ')}{completion.missing.length > 2 ? ` +${completion.missing.length - 2}` : ''}</span>
            )}
          </div>
          <div className="h-2 bg-elevated-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${completion.score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'personal',   label: 'Personal',   icon: User          },
  { id: 'skills',     label: 'Skills',     icon: Star          },
  { id: 'experience', label: 'Experience', icon: Briefcase     },
  { id: 'education',  label: 'Education',  icon: GraduationCap },
  { id: 'preferences',label: 'Preferences',icon: Settings      },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

const Profile = () => {
  const dispatch = useDispatch();
  const { data: profile, fetchStatus, error } = useSelector((s) => s.profile);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (!profile) dispatch(fetchProfile());
  }, [dispatch, profile]);

  if (fetchStatus === 'loading' || fetchStatus === 'idle') {
    return <Loader fullPage />;
  }

  if (fetchStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 mx-auto max-w-xl px-6">
        <p className="text-rose-600 dark:text-rose-300 text-sm">{error || 'Failed to load profile'}</p>
        <button
          type="button"
          onClick={() => dispatch(fetchProfile())}
          className="mt-4 text-sm text-primary-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const completion = calcCompletion(profile);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Hero */}
      <ProfileHero profile={profile} completion={completion} />

      {/* Tab bar */}
      <div className="bg-elevated rounded-xl border border-line shadow-sm">
        <div className="flex overflow-x-auto scrollbar-none">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={[
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-ink-muted hover:text-ink hover:border-line',
              ].join(' ')}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'personal'    && <PersonalInfoForm />}
        {activeTab === 'skills'      && <SkillsManager />}
        {activeTab === 'experience'  && <ExperienceManager />}
        {activeTab === 'education'   && <EducationManager />}
        {activeTab === 'preferences' && <PreferencesForm />}
      </div>
    </div>
  );
};

export default Profile;
