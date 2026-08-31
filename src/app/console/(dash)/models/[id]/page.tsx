import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CMS_LOCALE } from '@/lib/admin-path';
import { PageHeader } from '@/components/admin/PageHeader';
import { ModelForm } from '@/components/admin/ModelForm';
import { PhotoUploader } from '@/components/admin/PhotoUploader';
import { getModelForEdit, listCategories } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

export default async function EditModelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [model, categories] = await Promise.all([getModelForEdit(id), listCategories()]);
  if (!model) notFound();

  return (
    <>
      <PageHeader
        title={model.stage_name}
        description={model.slug}
        action={
          <Link
            href={`/${CMS_LOCALE}/nguoi-mau/${model.slug}`}
            target="_blank"
            className="text-xs uppercase tracking-[0.16em] text-bone-dim hover:text-gold"
          >
            View ↗
          </Link>
        }
      />

      <section className="mb-12">
        <h2 className="kicker mb-4">Photos</h2>
        <PhotoUploader modelId={model.id} photos={model.photos} />
      </section>

      <section>
        <h2 className="kicker mb-4">Details</h2>
        <ModelForm model={model} categories={categories} />
      </section>
    </>
  );
}
