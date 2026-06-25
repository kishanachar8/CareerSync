const Card = ({ children, className = '', hover = false }) => (
  <div className={[
    'bg-elevated rounded-2xl border border-line shadow-card',
    hover && 'hover:shadow-card-hover hover:border-primary-200 dark:hover:border-primary-800 transition-shadow duration-200',
    className,
  ].filter(Boolean).join(' ')}>
    {children}
  </div>
);

Card.Header = ({ children, className = '' }) => (
  <div className={`px-4 sm:px-5 py-4 border-b border-line ${className}`}>
    {children}
  </div>
);

Card.Body = ({ children, className = '' }) => (
  <div className={`px-4 sm:px-5 py-4 ${className}`}>
    {children}
  </div>
);

Card.Footer = ({ children, className = '' }) => (
  <div className={`px-4 sm:px-5 py-3.5 border-t border-line bg-elevated-2/60 rounded-b-2xl ${className}`}>
    {children}
  </div>
);

export default Card;
