/**
 * @deprecated
 * This file is maintained for backward compatibility only.
 * All API logic has been moved to `src/api/`.
 *
 * - New code should import from `../api` (single hook) or `../api/hooks/<domain>API`
 * - See `src/api/README.md` for migration guide
 */

if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
        '[Plannr] Importing from utils/authenticatedAPI is deprecated. ' +
            'Please import from src/api/ instead. See src/api/README.md for details.',
    );
}

export { useAuthenticatedAPI, setGlobalUpdateHandler } from '../api/index.js';
