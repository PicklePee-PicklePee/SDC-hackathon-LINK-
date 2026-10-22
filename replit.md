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

The user has a regular GPU Pod, not Serverless. Worker code is in `runpod/worker.py`; installation instructions and the API contract are in `docs/runpod-setup.md` and `docs/frontend-contract.md`.

Server environment variables `RUNPOD_WORKER_URL` and `RUNPOD_WORKER_TOKEN` connect to the worker over HTTPS. Never expose the token in the browser. Missing configuration produces explicit unavailable states; there is no simulated GPU telemetry, vector retrieval, or AI answer fallback.

GPU indexing, retrieval embeddings, chat inference, and optional LoRA fine-tuning execute on the user's Pod. No GPU job starts until explicitly submitted. The worker has not been deployed or GPU-tested in this environment.
