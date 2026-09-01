import Image from 'next/image';
import { publicPhotoUrl } from '@/lib/storage';
import { cn } from '@/lib/cn';

/**
 * The wordmark. Renders the uploaded logo when there is one, otherwise the
 * brand name as type — the name was hardcoded in six components before this,
 * so renaming the site meant a code change and a rebuild.
 *
 * The trailing dot is part of the mark, not the name: it is drawn separately
 * so it can take the accent colour without the stored name having to contain
 * punctuation.
 */
export function Brand({
  name,
  logoPath,
  className,
  logoHeight = 28,
  dotClassName = 'text-gold',
  showDot = true,
}: {
  name: string;
  logoPath?: string;
  className?: string;
  logoHeight?: number;
  dotClassName?: string;
  showDot?: boolean;
}) {
  const label = name?.trim() || 'STUDIO';

  if (logoPath) {
    return (
      <Image
        src={publicPhotoUrl(logoPath)}
        alt={label}
        height={logoHeight}
        width={logoHeight * 6}
        className={cn('h-auto w-auto object-contain', className)}
        style={{ maxHeight: logoHeight }}
        priority
        unoptimized
      />
    );
  }

  return (
    <span className={className}>
      {label}
      {showDot && <span className={dotClassName}>.</span>}
    </span>
  );
}
