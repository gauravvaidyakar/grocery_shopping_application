INSERT INTO "HomeHeroSlide" (
    "id",
    "eyebrow",
    "title",
    "description",
    "ctaLabel",
    "ctaHref",
    "imageUrl",
    "imageAlt",
    "isActive",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    'e911b71a-5ac8-4dbb-81aa-9ff5b83861af'::UUID,
    'Pure · Natural · Made in India',
    'From our villages to your home.',
    'Discover honest food made by rural producers using traditional methods and carefully selected ingredients.',
    'Shop now',
    '/products',
    '/assets/vishwaneed_hero_vegetables_image-BFvquqM8.png',
    'A fresh harvest of bitter gourds, carrots, cucumbers and leafy greens',
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "HomeHeroSlide");
