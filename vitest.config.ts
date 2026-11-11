import {defineConfig} from 'vitest/config';

// The vendored engine has independent Python and Node test runners. Do not
// execute those standalone scripts as Vitest suites when testing the Studio.
export default defineConfig({test:{include:['backend/src/**/*.test.ts']}});
