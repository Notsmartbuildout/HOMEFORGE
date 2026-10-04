# Baseline evidence

Date: 2026-10-04. Platform: Linux x86_64 cloud workspace. Node v24.19.0; npm 11.9.0. Upstream commit d68cadf703578f2cd3a7c77f820e18d342580c32.

| Check | Observed result |
|---|---|
| npm ci --include=dev | Exit 0; 262 packages installed. prepare reported a production-environment guard and fell back to svelte.config.js. Use NODE_ENV=production during subsequent setup/check/build. |
| NODE_ENV=production npm run check | 0 errors, 0 warnings |
| npm test | 125 test files; 1,175 tests passed |
| npm run catalog:check | 189 catalog entries, 204 GLBs and 20 textures verified |
| NODE_ENV=production npm run build | Passed with adapter-node; analytics and handoff uploads disabled |
| npm audit --audit-level=high | Failed: 6 vulnerabilities, 5 high and 1 low; affected dependency paths include @grpc/grpc-js via Firebase, devalue and DOMPurify |
| Playwright browser install | Failed: Chromium download produced invalid/truncated ZIP; other engines were not installed by that command |
| Chromium browser suite | Blocked by missing executable; 5 launch failures, 388 not run; no claim of application regression |
| Firefox / WebKit / render benchmarks | Not run; browser installation blocked |
| GitHub fork / Windows checkout | Not performed |

Logs in EVIDENCE. This is a reproducible baseline with documented limitations, not a fully passing release gate. Do not change dependency versions in the baseline commit. Review dependency remediation separately.
