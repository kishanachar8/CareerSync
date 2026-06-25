import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-canvas">
    <h1 className="text-6xl font-bold gradient-text">404</h1>
    <p className="text-xl text-ink mt-4">Page not found</p>
    <p className="text-ink-muted mt-2">The page you're looking for doesn't exist.</p>
    <Link to="/dashboard" className="mt-6 px-6 py-2.5 bg-gradient-brand text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
      Back to Dashboard
    </Link>
  </div>
);

export default NotFound;
