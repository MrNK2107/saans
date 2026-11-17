/** The Saans mark: a breath, drawn as two soft waves over a vermilion tile. Decorative beside the name. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className="logo"
    >
      <rect width="64" height="64" rx="15" fill="#b3411a" />
      <path
        d="M13 25c6-9 13-9 19 0s13 9 19 0"
        fill="none"
        stroke="#f7ecd6"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M13 40c6-9 13-9 19 0s13 9 19 0"
        fill="none"
        stroke="#f7ecd6"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
