import { z } from 'zod';
const vector = z.tuple([
  z.number().finite().min(-20).max(20),
  z.number().finite().min(-20).max(20),
  z.number().finite().min(-20).max(20),
]);
export const regions = [
  ['head', 'Đầu'],
  ['neck', 'Cổ'],
  ['shoulder', 'Vai'],
  ['chest', 'Ngực'],
  ['back', 'Lưng'],
  ['abdomen', 'Bụng / hông'],
  ['hindquarters', 'Mông'],
  ['foreleg', 'Chân trước'],
  ['hindleg', 'Chân sau'],
  ['hoof', 'Móng'],
  ['other', 'Vùng khác'],
] as const;
export const sides = [
  ['left', 'Trái'],
  ['right', 'Phải'],
  ['midline', 'Đường giữa'],
] as const;
export const surfaceLocationSchema = z
  .object({
    modelId: z.literal('horse-orelvys'),
    modelVersion: z.literal('1'),
    layer: z.literal('surface'),
    regionId: z.enum([
      'head',
      'neck',
      'shoulder',
      'chest',
      'back',
      'abdomen',
      'hindquarters',
      'foreleg',
      'hindleg',
      'hoof',
      'other',
    ]),
    side: z.enum(['left', 'right', 'midline']),
    point: vector,
    normal: vector.refine((v) => Math.abs(Math.hypot(...v) - 1) <= 0.01),
  })
  .strict();
export type SurfaceLocation = z.infer<typeof surfaceLocationSchema>;
export function detectAnatomy(
  point: SurfaceLocation['point'],
  normal: SurfaceLocation['normal'],
): Pick<SurfaceLocation, 'regionId' | 'side'> {
  const [px, py, pz] = point,
    [, , nz] = normal;
  const side =
    Math.abs(pz) >= 0.05 || Math.abs(nz) >= 0.28 ? (pz > 0 ? 'left' : 'right') : 'midline';
  const h = (py + 0.394) / 4,
    l = (px + 1.388) / 2.84;
  const regionId =
    h < 0.12
      ? 'hoof'
      : h < 0.42
        ? l < 0.5
          ? 'foreleg'
          : 'hindleg'
        : l < 0.22 && h > 0.5
          ? 'head'
          : l < 0.36 && h > 0.52
            ? 'neck'
            : l < 0.36 && h <= 0.52
              ? 'chest'
              : l >= 0.3 && l < 0.5 && h < 0.72
                ? 'shoulder'
                : l >= 0.36 && l < 0.76 && h >= 0.65
                  ? 'back'
                  : l >= 0.38 && l < 0.75 && h < 0.65
                    ? 'abdomen'
                    : l >= 0.72
                      ? 'hindquarters'
                      : 'other';
  return { regionId, side };
}
export function parsePick(message: unknown): SurfaceLocation {
  const pick = z.object({ point: vector, normal: vector }).parse(message);
  return surfaceLocationSchema.parse({
    modelId: 'horse-orelvys',
    modelVersion: '1',
    layer: 'surface',
    ...pick,
    ...detectAnatomy(pick.point, pick.normal),
  });
}
