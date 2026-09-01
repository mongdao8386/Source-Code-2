import { Container } from '@/components/ui/Container';
import { Brand } from '@/components/site/Brand';

// Shown site-wide when site_settings.maintenance_mode is on. The CMS stays
// reachable (it lives outside the (site) group).
export function MaintenanceScreen({ brandName = 'STUDIO' }: { brandName?: string }) {
  return (
    <Container className="pad-safe-top pad-safe-bottom flex min-h-dvh flex-col items-center justify-center text-center">
      <p className="font-display text-3xl text-bone">
        <Brand name={brandName} />
      </p>
      <p className="kicker mt-4">Bảo trì / Under maintenance</p>
      <p className="mt-3 max-w-sm text-sm text-bone-dim">
        Chúng tôi sẽ trở lại sớm. We&apos;ll be back shortly.
      </p>
    </Container>
  );
}
