// Test-only helper: lets plain Node resolve extensionless relative imports (as Next.js/tsc do)
// so the tests can load lib/*.ts without changing the app's tsconfig. Run with `npm test`.
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context); }
  catch (error) {
    if (error && error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.')) return next(specifier + '.ts', context);
    throw error;
  }
}`), import.meta.url);
