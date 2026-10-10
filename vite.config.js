import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({build:{rollupOptions:{input:{main:resolve(import.meta.dirname,'index.html'),field:resolve(import.meta.dirname,'field-command.html'),forecast:resolve(import.meta.dirname,'forecast-lab.html'),whirl:resolve(import.meta.dirname,'whirl-lab.html')}}}});
