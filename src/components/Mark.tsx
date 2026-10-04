export function Mark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 2.5l8.5 4.75v9.5L12 21.5l-8.5-4.75v-9.5L12 2.5z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3.5 7.25L12 12l8.5-4.75M12 12v9.5" stroke="currentColor" strokeWidth="1.3" opacity=".45" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    </svg>
  );
}
