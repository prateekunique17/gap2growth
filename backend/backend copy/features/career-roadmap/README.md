# Career Roadmap backend feature

This feature is mounted at `/api/career` by the standalone Express app in `backend/server.js`. Its responsibilities are separated into `resume`, `skillAnalysis`, `roadmap`, `jobRecommendations`, `storage`, and `api` folders.

The feature has no database dependency. It stores per-user state in JSON under this feature's `data/` directory by default. In standalone development it uses one local demo identity. Production integration must mount the router after verified host authentication so the authenticated identity is available as `req.user.id`.

Configure keys in `backend/.env` using `backend/.env.example`. `AI_DEMO_MODE=true` works without provider keys; `AI_DEMO_MODE=false` requires `GEMINI_API_KEY`. `HIREBASE_API_KEY` is optional and enables current job search results. Never put provider keys in frontend code.

See the [project README](../../../README.md) for setup and the [API guide](../../../API.md) for request examples.
