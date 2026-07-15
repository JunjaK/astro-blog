import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    thumbnail: z.string().optional(),
    created: z.coerce.date(),
    tags: z.array(z.string()).optional(),
    updated: z.coerce.date().optional(),
    description: z.string().optional(),
    artist: z.string().optional(),
    album: z.string().optional(),
    releaseYear: z.number().optional(),
    appleMusicUrl: z.url().optional(),
    youtubeMusicUrl: z.url().optional(),
    lyricsType: z.enum(['jpop', 'kpop', 'pop']).optional(),
    // ── tasting note (category: 'Tasting') ──
    drinkKind: z.enum(['nihonshu', 'whisky', 'beer', 'other']).optional(),
    brewery: z.string().optional(),
    // 産地(도도부현). 47개 실물 고정 목록이라 enum 이중화가 안전하다 — tokuteiMeisho 와 같은 관례로,
    // 손으로 쓴 MDX 의 오타를 빌드 때 잡는다. 상세 주소는 에디터 마스터 전용(카드엔 번지수 불필요).
    prefecture: z
      .enum([
        '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
        '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
        '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
        '岐阜県', '静岡県', '愛知県', '三重県',
        '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
        '鳥取県', '島根県', '岡山県', '広島県', '山口県',
        '徳島県', '香川県', '愛媛県', '高知県',
        '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
      ])
      .optional(),
    brand: z.string().optional(),
    yomigana: z.string().optional(),
    brandYomigana: z.string().optional(),
    breweryYomigana: z.string().optional(),
    tokuteiMeisho: z
      .enum(['純米大吟醸', '大吟醸', '純米吟醸', '吟醸', '特別純米', '特別本醸造', '純米', '本醸造', '普通酒'])
      .optional(),
    riceType: z.array(z.string()).optional(),
    seimaiBuai: z.number().int().gte(0).lte(100).optional(),
    alcohol: z.number().gte(0).optional(),
    nihonshuDo: z.number().optional(),
    sando: z.number().gte(0).optional(),
    amakara: z.number().int().gte(1).lte(8).optional(),
    noutan: z.number().int().gte(1).lte(8).optional(),
    flavorTags: z.array(z.string()).optional(),
  }),
});

const project = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/project' }),
  schema: z.object({
    title: z.string(),
    thumbnail: z.string().optional(),
    duration: z.string(),
    techStacks: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
});

const playground = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/playground' }),
  schema: z.object({
    title: z.string(),
    thumbnail: z.string().optional(),
    duration: z.string(),
    techStacks: z.array(z.string()).optional(),
    description: z.string().optional(),
  }),
});

export const collections = { blog, project, playground };
