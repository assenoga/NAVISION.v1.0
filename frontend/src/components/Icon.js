const icons = {
  approvals: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="5" fill="#0f766e" />
      <path d="M8 12.2l2.5 2.5L16.5 8" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="6" r="3" fill="#ffd84d" />
    </>
  ),
  bell: (
    <>
      <path d="M6 10a6 6 0 1112 0v4.5l2 2.4H4l2-2.4V10z" fill="#ffffff" stroke="#0f766e" strokeWidth="1.8" />
      <path d="M9.5 19a2.7 2.7 0 005 0" fill="none" stroke="#d7193f" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18.2" cy="6" r="3.2" fill="#20c997" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="4" width="8" height="8" rx="2" fill="#d7193f" />
      <rect x="13" y="4" width="8" height="14" rx="2" fill="#0f766e" />
      <rect x="3" y="14" width="8" height="6" rx="2" fill="#ffd84d" />
    </>
  ),
  documents: (
    <>
      <path d="M6 2.8h8.4L19 7.4V21H6V2.8z" fill="#ffffff" stroke="#0f766e" strokeWidth="1.6" />
      <path d="M14 3v5h5" fill="#dff3ef" stroke="#0f766e" strokeWidth="1.4" />
      <rect x="4" y="10.5" width="14" height="6" rx="2" fill="#2f80ed" />
      <text x="11" y="14.8" textAnchor="middle" fill="#ffffff" fontSize="4" fontWeight="800">DOC</text>
    </>
  ),
  reports: (
    <>
      <rect x="3.5" y="3" width="17" height="18" rx="4" fill="#ffffff" stroke="#0f766e" strokeWidth="1.5" />
      <rect x="7" y="12" width="2.5" height="5" rx="1" fill="#d7193f" />
      <rect x="11" y="8" width="2.5" height="9" rx="1" fill="#ffd84d" />
      <rect x="15" y="6" width="2.5" height="11" rx="1" fill="#0f766e" />
    </>
  ),
  requests: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="4" fill="#ffffff" stroke="#0f766e" strokeWidth="1.6" />
      <rect x="8" y="7" width="8" height="1.8" rx=".9" fill="#d7193f" />
      <rect x="8" y="11" width="8" height="1.8" rx=".9" fill="#0f766e" />
      <rect x="8" y="15" width="5" height="1.8" rx=".9" fill="#ffd84d" />
      <circle cx="18" cy="6" r="3" fill="#20c997" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" fill="#ffffff" stroke="#0f766e" strokeWidth="2" />
      <path d="M15.2 15.2L21 21" stroke="#d7193f" strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="#0f766e" />
      <circle cx="12" cy="12" r="3.2" fill="#ffffff" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" stroke="#ffd84d" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.8l7.2 3.1v5.2c0 4.5-2.9 8.4-7.2 10-4.3-1.6-7.2-5.5-7.2-10V5.9L12 2.8z" fill="#0f766e" />
      <path d="M8.7 12.2l2 2 4.7-5" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 2.8l7.2 3.1" fill="none" stroke="#ffd84d" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  vendors: (
    <>
      <path d="M4 20V8.5L12 4l8 4.5V20" fill="#ffffff" stroke="#0f766e" strokeWidth="1.7" strokeLinejoin="round" />
      <rect x="8" y="12" width="8" height="8" rx="1.5" fill="#dff3ef" stroke="#0f766e" strokeWidth="1.4" />
      <path d="M7.5 9.5h9" stroke="#d7193f" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.2" fill="#ffd84d" />
    </>
  ),
  value: (
    <>
      <circle cx="12" cy="12" r="9" fill="#0f766e" />
      <path d="M15.8 7.5H11a2.5 2.5 0 000 5h2a2.5 2.5 0 010 5H8" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 5.5v13" stroke="#ffd84d" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  x: (
    <>
      <circle cx="12" cy="12" r="9" fill="#d7193f" />
      <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
    </>
  )
}

const Icon = ({ name, className = '', title }) => (
  <svg
    className={`app-icon app-icon-picture ${className}`.trim()}
    viewBox="0 0 24 24"
    aria-hidden={title ? undefined : 'true'}
    role={title ? 'img' : undefined}
  >
    {title && <title>{title}</title>}
    {icons[name] || icons.dashboard}
  </svg>
)

export default Icon
