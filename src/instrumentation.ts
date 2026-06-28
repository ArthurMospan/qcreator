export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { seedIfEmpty } = require('../scripts/seed') as { seedIfEmpty: () => Promise<void> };
      await seedIfEmpty();
    } catch (e) {
      console.error('[instrumentation] seed error:', e);
    }
  }
}
