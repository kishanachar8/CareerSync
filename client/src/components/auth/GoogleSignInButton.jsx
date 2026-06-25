import Button from '../ui/Button.jsx';

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.36 0-4.36-1.59-5.08-3.73H.9v2.34A8.997 8.997 0 0 0 9 18z"
    />
    <path
      fill="#FBBC05"
      d="M3.92 10.69A5.4 5.4 0 0 1 3.64 9c0-.59.1-1.16.28-1.69V4.97H.9A8.997 8.997 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.02-2.34z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58A8.59 8.59 0 0 0 9 0 8.997 8.997 0 0 0 .9 4.97l3.02 2.34C4.64 5.17 6.64 3.58 9 3.58z"
    />
  </svg>
);

const redirectToGoogleAuth = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
  window.location.href = `${apiBase}/auth/google`;
};

const GoogleSignInButton = () => (
  <Button type="button" variant="secondary" className="w-full" size="lg" onClick={redirectToGoogleAuth}>
    <GoogleIcon />
    Continue with Google
  </Button>
);

export default GoogleSignInButton;
