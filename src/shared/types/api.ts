import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type Pagination = z.infer<typeof paginationSchema>;
export interface Page<T> {
  items: T[];
  pagination: Pagination;
}
export interface ListParams {
  page?: number;
  limit?: number;
}
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Mã định danh không hợp lệ');
export const referenceSchema = z
  .union([
    z.string(),
    z
      .object({
        _id: z.string(),
        name: z.string().optional(),
        fullName: z.string().optional(),
        code: z.string().optional(),
        registrationCode: z.string().optional(),
      })
      .passthrough(),
  ])
  .nullable()
  .optional();
export type Reference = z.infer<typeof referenceSchema>;
export const referenceId = (value: Reference) => (typeof value === 'string' ? value : value?._id);
export const referenceName = (value: Reference) =>
  typeof value === 'object' && value ? (value.fullName ?? value.name ?? value.code ?? '—') : '—';

export function parsePage<T>(
  data: Record<string, unknown>,
  key: string,
  schema: z.ZodType<T>,
): Page<T> {
  return {
    items: z.array(schema).parse(data[key]),
    pagination: paginationSchema.parse(data.pagination),
  };
}
