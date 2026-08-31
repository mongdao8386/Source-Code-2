-- ============================================================================
-- seed.sql — safe to run repeatedly. Creates the settings singleton and a
-- starter set of categories. The OWNER auth user + profile are created
-- separately by `npm run seed:owner` (needs the service-role key).
-- ============================================================================

insert into public.site_settings (id, hero, announcement)
values (
  true,
  jsonb_build_object(
    'headline', jsonb_build_object('vi', 'Gương mặt cho khung hình của bạn', 'en', 'Faces for your frame'),
    'sub', jsonb_build_object(
      'vi', 'Tuyển chọn người mẫu chụp ảnh chuyên nghiệp.',
      'en', 'A curated roster of photographic models.'
    ),
    'image', ''
  ),
  jsonb_build_object('enabled', false, 'text', jsonb_build_object('vi', '', 'en', ''))
)
on conflict (id) do nothing;

insert into public.categories (slug, name, sort_order) values
  ('thoi-trang', jsonb_build_object('vi', 'Thời trang', 'en', 'Fashion'), 1),
  ('beauty',     jsonb_build_object('vi', 'Beauty',     'en', 'Beauty'),  2),
  ('ky-yeu',     jsonb_build_object('vi', 'Kỷ yếu',     'en', 'Yearbook'), 3),
  ('su-kien',    jsonb_build_object('vi', 'Sự kiện',    'en', 'Events'),  4),
  ('thuong-mai', jsonb_build_object('vi', 'Thương mại', 'en', 'Commercial'), 5)
on conflict (slug) do nothing;

-- Published on purpose: the header and footer always link to these three, so
-- shipping them as drafts would leave a fresh install 404-ing its own nav.
-- Replace the placeholder copy from the CMS (Trang nội dung).
insert into public.pages (slug, title, body, status) values
  ('about',
   jsonb_build_object('vi', 'Về chúng tôi', 'en', 'About us'),
   jsonb_build_object('vi', E'## Về chúng tôi\n\nNội dung đang được cập nhật.', 'en', E'## About us\n\nContent coming soon.'),
   'published'),
  ('terms',
   jsonb_build_object('vi', 'Điều khoản', 'en', 'Terms'),
   jsonb_build_object('vi', E'## Điều khoản sử dụng\n\nNội dung đang được cập nhật.', 'en', E'## Terms of use\n\nContent coming soon.'),
   'published'),
  ('guide',
   jsonb_build_object('vi', 'Hướng dẫn', 'en', 'Guide'),
   jsonb_build_object('vi', E'## Hướng dẫn đặt lịch\n\n1. Chọn người mẫu.\n2. Nhấn **Đặt lịch**.\n3. Trao đổi chi tiết qua Telegram.', 'en', E'## How to book\n\n1. Pick a model.\n2. Tap **Book**.\n3. Sort out the details on Telegram.'),
   'published')
on conflict (slug) do nothing;
