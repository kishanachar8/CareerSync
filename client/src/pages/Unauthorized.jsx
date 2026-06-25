import { Link } from 'react-router-dom';

const Unauthorized = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 sm:p-8 bg-canvas">
    <h1 className="text-6xl font-bold gradient-text">403</h1>
    <p className="text-xl text-ink mt-4">Access denied</p>
    <p className="text-ink-muted mt-2">You don't have permission to view this page.</p>
    <Link to="/dashboard" className="mt-6 px-6 py-2.5 bg-gradient-brand text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
      Back to Dashboard
    </Link>
  </div>
);

export default Unauthorized;
