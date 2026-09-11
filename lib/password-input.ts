import { z } from 'zod';

export const passwordLoginInput = z.object({
  email: z.string().trim().email().max(150),
  // Never trim or otherwise transform passwords.
  password: z.string().min(1).max(1024),
  next: z.string().optional(),
}).strict();

export const passwordChangeInput = z.object({
  password: z.string().min(10, 'Use pelo menos 10 caracteres.').max(64, 'Use no máximo 64 caracteres.')
    .refine(value => new TextEncoder().encode(value).length <= 72, 'Esta senha é muito longa. Reduza a quantidade de caracteres.'),
  confirmation: z.string(),
  currentPassword: z.string().max(1024).optional(),
}).strict().refine(value => value.password === value.confirmation, { message: 'As senhas precisam ser iguais.', path: ['confirmation'] });
