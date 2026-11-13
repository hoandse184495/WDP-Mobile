import { z } from 'zod';
export const userSchema = z.object({
  _id: z.string().min(1),
  fullName: z.string().min(1),
  email: z.email(),
  role: z.enum([
    'club_manager',
    'warehouse_keeper',
    'head_trainer',
    'veterinarian',
    'groom',
    'horse_owner',
  ]),
  phone: z.string().nullable().optional(),
  isActive: z.boolean().refine((value) => value, 'Tài khoản không hoạt động.'),
});
export type User = z.infer<typeof userSchema>;
export const loginResponseSchema = z.object({ user: userSchema, token: z.string().min(1) });
