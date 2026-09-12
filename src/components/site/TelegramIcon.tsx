import { cn } from '@/lib/cn';

/** The paper plane. Inherits `currentColor`, so it takes whatever text colour surrounds it. */
export function TelegramIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn('shrink-0', className)}
    >
      <path d="M21.94 4.43 18.8 19.3c-.24 1.05-.86 1.31-1.74.82l-4.8-3.55-2.32 2.24c-.26.26-.47.47-.97.47l.34-4.9 8.93-8.08c.39-.35-.08-.54-.6-.19L6.6 13.05 1.85 11.57c-1.03-.32-1.05-1.03.22-1.53L20.6 2.9c.86-.32 1.6.2 1.34 1.53z" />
    </svg>
  );
}
