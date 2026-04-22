import { describe, expect, it } from 'vitest';

describe('resolveProtectedRoute', () => {
  it('redirects an authenticated user with incomplete onboarding to onboarding', async () => {
    const { resolveProtectedRoute } = await import('./routes');

    const result = resolveProtectedRoute({
      user: { id: 'user-1' },
      onboardingComplete: false,
      biometricEnabled: false,
      biometricLocked: false,
    });

    expect(result).toBe('/onboarding');
  });
});
