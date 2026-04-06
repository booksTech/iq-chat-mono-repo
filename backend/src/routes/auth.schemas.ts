import { z } from 'zod';

const emailField = z
  .string({ required_error: 'Email is required' })
  .trim()
  .email('Enter a valid email address')
  .transform((value) => value.toLowerCase());

const passwordField = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long');

export const signupSchema = z.object({
  body: z
    .object({
      email: emailField,
      password: passwordField,
      confirmPassword: z.string({ required_error: 'Confirm password is required' })
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Confirm password does not match',
      path: ['confirmPassword']
    })
});

export const signinSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required')
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: emailField
  })
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string({ required_error: 'Reset token is required' }).min(1, 'Reset token is required'),
      password: passwordField,
      confirmPassword: z.string({ required_error: 'Confirm password is required' })
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Confirm password does not match',
      path: ['confirmPassword']
    })
});

export type SignupBody = z.infer<typeof signupSchema>['body'];
export type SigninBody = z.infer<typeof signinSchema>['body'];
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>['body'];
