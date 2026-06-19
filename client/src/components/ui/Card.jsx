const Card = ({ children, className = '', hover = false }) => (
  <div className={[
    'bg-white rounded-2xl border border-surface-200 shadow-card',
    hover && 'hover:shadow-card-hover hover:border-primary-100 transition-shadow duration-200',
    className,
  ].filter(Boolean).join(' ')}>
    {children}
  </div>
);

Card.Header = ({ children, className = '' }) => (
  <div className={`px-5 py-4 border-b border-surface-100 ${className}`}>
    {children}
  </div>
);

Card.Body = ({ children, className = '' }) => (
  <div className={`px-5 py-4 ${className}`}>
    {children}
  </div>
);

Card.Footer = ({ children, className = '' }) => (
  <div className={`px-5 py-3.5 border-t border-surface-100 bg-surface-50/60 rounded-b-2xl ${className}`}>
    {children}
  </div>
);

export default Card;
