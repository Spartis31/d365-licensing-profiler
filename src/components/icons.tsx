/** Inline SVG so the header keeps working offline and follows the button colour. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconNew() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path {...stroke} d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9.5z" />
      <path {...stroke} d="M13.5 3v5a1.5 1.5 0 0 0 1.5 1.5h4" />
      <path {...stroke} d="M12 12.5v5M9.5 15h5" />
    </svg>
  );
}

export function IconOpen() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path {...stroke} d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v1.5" />
      <path {...stroke} d="M3 7.5v10A1.5 1.5 0 0 0 4.5 19h13l3.2-6.8a.8.8 0 0 0-.72-1.2H7.4a1.5 1.5 0 0 0-1.36.87L3 19" />
    </svg>
  );
}

/** Classic Office floppy disk. */
export function IconSave() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path {...stroke} d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path {...stroke} d="M8 3v5.5h7V3" />
      <path {...stroke} d="M7 21v-6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v6" />
    </svg>
  );
}

/** Excel keeps its own colours: the green tile is what makes it recognisable. */
export function IconExcel() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="none"
        stroke="#1d6f42"
        strokeWidth={1.6}
        strokeLinejoin="round"
        d="M14 2.6H6.2a1.2 1.2 0 0 0-1.2 1.2v16.4a1.2 1.2 0 0 0 1.2 1.2h11.6a1.2 1.2 0 0 0 1.2-1.2V7.6z"
      />
      <path fill="none" stroke="#1d6f42" strokeWidth={1.6} strokeLinejoin="round" d="M14 2.6v4.2a.8.8 0 0 0 .8.8H19" />
      <rect x="2.2" y="9.6" width="11.4" height="9.2" rx="1.4" fill="#1d6f42" />
      <path d="M5.1 11.9l5.6 4.6M10.7 11.9l-5.6 4.6" stroke="#ffffff" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function IconGuide() {
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path {...stroke} d="M4 4.8A1.8 1.8 0 0 1 5.8 3H10a2.5 2.5 0 0 1 2 1 2.5 2.5 0 0 1 2-1h4.2A1.8 1.8 0 0 1 20 4.8v12.4a1.8 1.8 0 0 1-1.8 1.8H14a2.5 2.5 0 0 0-2 1 2.5 2.5 0 0 0-2-1H5.8A1.8 1.8 0 0 1 4 17.2z" />
      <path {...stroke} d="M12 4v16" />
    </svg>
  );
}

export function IconTutorial() {
  // Same 4-to-20 ink band as the other icons, so paddings look equal to the eye.
  return (
    <svg className="btn-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path {...stroke} d="M12 4.8 20 8.3l-8 3.6L4 8.3z" />
      <path {...stroke} d="M7 10.1v4.1c0 1.6 2.2 2.9 5 2.9s5-1.3 5-2.9v-4.1" />
      <path {...stroke} d="M20 8.3v4.2" />
    </svg>
  );
}
