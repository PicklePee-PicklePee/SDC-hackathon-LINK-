# Link — running this project

- Run the app with `npm run dev`.
- Express serves the API and Vite development middleware on port 5000. Same-origin browser requests use Clerk session cookies.
- Create a production build with `npm run build`.
- Run the production server with `npm start`.
- Run the database-backed API tests with `npm test`. Tests use an isolated listener and synthetic identities, clean up their own database fixtures, and disable GPU connections in the test process.

## Database and access

The application uses PostgreSQL via `DATABASE_URL`. Development schema is in `server/schema.sql` and was applied to the development database. Do not execute DDL at application startup. Replit's publish flow manages production schema changes.

Clerk handles sign-in and sign-up. Creating a workspace grants ownership only of that new workspace. Employees use an owner-shared join code to request access and remain pending until approved. Every workspace endpoint enforces membership on the server; the owner/learner UI switcher never grants privileges.

Thirty optional, clearly labeled sample SOPs are seeded when creating a workspace: ten each for culinary, technology, and support. Learning modules, quizzes, and sandboxes are illustrative sample training, not verified enterprise policy. Modules and assessments currently use the sample curriculum, not automatic generation from edited company documents.

## RunPod GPU service

The user terminated their regular Pod and chose a custom RunPod Serverless worker for the full indexing and LoRA pipeline. The previous stock Ollama template is not compatible. Worker code is in `runpod/worker.py`, with the queue entry point `runpod/handler.py` and image definition `runpod/Dockerfile`; setup and API instructions are in `docs/runpod-setup.md` and `docs/frontend-contract.md`.

Serverless uses `RUNPOD_WORKER_MODE=serverless`, `RUNPOD_WORKER_URL` (the RunPod endpoint base URL), and secret `RUNPOD_API_KEY`. Legacy Pod mode uses `RUNPOD_WORKER_MODE=pod` and secret `RUNPOD_WORKER_TOKEN`. Never expose credentials in the browser. Missing configuration produces explicit unavailable states; there is no simulated GPU telemetry, vector retrieval, or AI answer fallback.

GPU indexing, retrieval embeddings, chat inference, and optional LoRA fine-tuning execute on RunPod. Serverless requires a persistent network volume at `/runpod-volume`, maximum workers=1 and concurrency=1. API-only health checks do not submit compute; billable GPU diagnostics require explicit approval. Indexing/training require `computeApproved:true` after the UI confirmation. Submissions are never automatically retried. The server polls active jobs without an open browser to persist results before RunPod's retention expires.

The custom image has not been built/deployed or GPU-tested. Local tests cover transport contracts with synthetic responses, not live GPU execution. CUDA/model compatibility, indexing, revision-filtered retrieval, cited chat, telemetry, and training failures still require approved live verification. The signed-in owner UI must be checked with tests or an authenticated browser; the preview screenshot cannot sign in.
