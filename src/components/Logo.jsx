export default function Logo({ iconOnly = false }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0, userSelect: 'none' }}>
      <svg
        width="26" height="26"
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ display: 'block', flexShrink: 0 }}
      >
        <rect width="100" height="100" rx="18" fill="#1f5fa6" />
        <path
          d="M 87,7 L 7,7 L 7,93 L 87,93 L 87,77 L 19,77 L 62,50 L 19,23 L 87,23 Z"
          fill="white"
        />
      </svg>
      {!iconOnly && (
        <span style={{
          fontWeight: 700,
          fontSize: 15,
          color: 'var(--ink)',
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}>
          Sigma
        </span>
      )}
    </span>
  );
}
