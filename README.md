Link — AI-Powered Onboarding for Teams
> Link helps small and medium-sized businesses onboard interns and new hires with company-specific learning materials, quizzes, and an AI assistant grounded in company documents.
## Team information
| Field | Details |
|---|---|
| Project / team name | Link |
| Team domain | Domain 2 |
| SDG track | **SDG 4:** Quality Education<br>**SDG 8:** Decent Work and Economic Growth<br>**SDG 9:** Industry, Innovation and Infrastructure |
| Team leader | Samuel Phang Han Wen |
| University | Xiamen University Malaysia |
| Team size | 5 |
## Links
| Resource | Link |
|---|---|
| GitHub repository | [PicklePee-PicklePee/SDC-hackathon-LINK-](https://github.com/PicklePee-PicklePee/SDC-hackathon-LINK-) |
| Replit project |  ([Agent chat](https://replit.com/t/sdchackathon-wzd5da4ky3/chats/chat-cnv_15qhj6cm5q85fvz7m5t48m6e07)) |
| Live demo | [sdc-hackathon-link.replit.app](https://sdc-hackathon-link.replit.app) |
| RunPod endpoint | [RunPod endpoint](https://api.runpod.ai/v2/ja7lghtr9kwj4h) |
| Slide deck | [Link-Slide-deck](https://github.com/PicklePee-PicklePee/SDC-hackathon-LINK-/blob/3d5fd3d52d2d0037707adf7fb9ba31bca61af796/Link-pitch-deck.pptx) |
| Demo video | [Link-Demo-video](https://github.com/PicklePee-PicklePee/SDC-hackathon-LINK-/blob/29dbaf53bb0f5dddcc75e20d867e7957640cde05/Link-demo-video-narrated-captioned.mp4) |
## Overview
### Problem
Small and medium-sized businesses often depend on experienced employees to explain company processes to every new intern or hire. Repeating the same guidance takes time away from senior staff, while new team members may struggle to find accurate answers or learn procedures consistently. This makes onboarding harder to scale, especially for teams with limited training resources.
### Solution
Link turns a company's standard operating procedures (SOPs) and other internal documents into a guided onboarding experience. Owners can organize training content and invite interns; learners can work through learning modules, quizzes, and practice activities, then ask an AI assistant questions about the company's documents. The assistant retrieves relevant passages and displays its sources to help users verify answers.
### Key features
- **Company workspaces and membership approval:** Owners create workspaces and approve interns before they can access company materials.
- **Document-based training:** Owners can add, organize, and update company documents; sample SOPs are available for demonstration.
- **Guided learning:** Interns can use training modules, quizzes, and practice sandboxes.
- **Document-grounded AI assistant:** Learners can ask questions and receive answers with references to relevant source documents.
- **GPU-supported knowledge processing:** A RunPod worker is designed to index documents for semantic search and can optionally run workspace-specific LoRA fine-tuning.
> Sample SOPs are examples, not verified company policies. Review AI-generated responses before using them for high-stakes decisions. The current document importer supports TXT, Markdown, CSV, and JSON; PDF and DOCX ingestion is not implemented.
## Technology stack
| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | Node.js 20, Express 5 |
| Database | PostgreSQL 16 |
| Authentication | Clerk |
| GPU worker | Python, FastAPI, PyTorch, Hugging Face Transformers, Sentence Transformers, HNSWlib, PEFT |
| Default language model | Qwen/Qwen2.5-0.5B-Instruct |
| Default embedding model | sentence-transformers/all-MiniLM-L6-v2 |
| Development / hosting | Replit |
| GPU compute integration | RunPod |
The model names above are the defaults configured in the repository; deployment settings may override them.
## Architecture
~~~text
Learner or owner
       ↓
React web app on Replit
       ↓
Express API ─────→ PostgreSQL and Clerk
       │
       └─────────→ RunPod GPU worker
                    document indexing, retrieval, AI chat,
                    and optional LoRA fine-tuning
~~~
The RunPod worker handles GPU workloads separately from the Replit application server. See [docs/runpod-setup.md](docs/runpod-setup.md) for deployment and configuration details.
## Project structure
~~~text
.
├── docs/
│   ├── frontend-contract.md
│   └── runpod-setup.md
├── runpod/
│   ├── handler.py                  # RunPod Serverless entry point
│   ├── worker.py                   # GPU indexing, retrieval, chat, and training
│   ├── Dockerfile
│   └── requirements.txt
├── server/
│   ├── api.js                      # Express API routes
│   ├── content.js                  # Sample learning content
│   ├── db.js                       # PostgreSQL connection
│   ├── index.js                    # Application server entry point
│   ├── runpod-serverless.js        # RunPod Serverless integration
│   ├── worker.js                   # Worker connection and requests
│   └── schema.sql                  # Database schema
├── src/
│   ├── components/
│   ├── pages/
│   ├── App.jsx
│   ├── api.js
│   ├── index.css
│   └── main.jsx
├── tests/
│   ├── api.test.js
│   └── serverless.test.js
├── Dockerfile.runpod
├── package.json
├── vite.config.js
├── .replit
├── LICENSE
└── README.md
~~~
## How to run
### Run on Replit
1. Open the Replit project (**add the project/editor URL above**) or import this repository from GitHub.
2. Configure the PostgreSQL database and Clerk settings required by the app in Replit Secrets.
3. For the Serverless GPU worker, configure these server-side variables:
   - RUNPOD_WORKER_MODE=serverless
   - RUNPOD_WORKER_URL=https://api.runpod.ai/v2/YOUR_ENDPOINT_ID
   - RUNPOD_API_KEY — store this as a secret; never commit or share its value.
4. Run the Replit app. The repository's .replit configuration starts it with npm run dev.
The RunPod URL supplied for this project is https://api.runpod.ai/v2/ja7lghtr9kwj4h. Keep the API key only in Replit Secrets. The app can run without a connected GPU worker, but AI/GPU features will be unavailable.
### Run locally
**Prerequisites:** Node.js 20 or later and access to a PostgreSQL database. Clerk and RunPod credentials are needed for authenticated and GPU-backed functionality.
~~~bash
git clone https://github.com/PicklePee-PicklePee/SDC-hackathon-LINK-.git
cd SDC-hackathon-LINK-
npm install
# Configure the required database, Clerk, and (optionally) RunPod environment
# variables in your local environment. Never commit secret values.
npm run dev
~~~
The development server listens on port 5000. For RunPod configuration details, read [docs/runpod-setup.md](docs/runpod-setup.md).
### Build and test
~~~bash
npm run build
npm test
npm run lint
~~~
## How we use Replit
We used Replit as the main environment for building the application with AI-assisted coding. During development, our team learned to follow and review what the AI was changing so we could understand the code, catch bugs early, and be prepared to maintain the app. The project is configured for Replit hosting, and the live demo is linked above.

**Proof of use:** [submission/SDC2026_Link_Replit_POU.pdf](submission/SDC2026_Link_Replit_POU.pdf)
## How we use RunPod
Link's GPU worker is designed to run document indexing and semantic retrieval, AI chat, and optional LoRA fine-tuning away from the Replit application server. The application connects to a custom RunPod Serverless endpoint using RUNPOD_WORKER_URL and the server-side secret RUNPOD_API_KEY.
**Verification note:** The repository's RunPod setup guide says the custom Serverless worker still needs to be built and GPU-tested. If your team has since completed those steps, update this note with the verified model, GPU, and workload details. Do not publish an API key.

**Proof of use:** [submission/SDC2026_Link_Runpod_POU.pdf](submission/SDC2026_Link_Runpod_POU.pdf)
## Challenges and learnings
One challenge of AI-assisted development was keeping up with the code being generated. We learned that the team needs to understand and review each change, rather than treating generated code as a black box. That makes it easier to find bugs, explain how the app works, and maintain it after the hackathon.
## Future improvements
- Adapt Link for more SME industries and company-specific onboarding workflows.
- Add more training content formats and tools for owners to create role-specific learning paths.
- Improve learner progress tracking and give owners clearer visibility into onboarding progress.
## Team
| Name | Role | GitHub |
|---|---|---|
| Samuel Phang Han Wen | Team leader — Backend | Synx |
| KHOO LI LING | PPT - Pitch | kxthsrynk |
| CHIN YUNE YUN| PPT - Pitch | **TODO: GitHub handle** |
| TAN AIK CHANG | Backend - Frontend | Chang 昌 |
| SWA CHIN KAI | Backend - Frontend | sc.kai05 |
## Submission checklist
- [ ] Confirm the team's official name and selected SDG track.
- [ ] Add the Replit project/editor URL (not only the Agent chat URL).
- [ ] Add slide deck and demo video links.
- [ ] Add all five member names, roles, and GitHub handles.
- [ ] Add the preliminary submission and technology declaration PDFs.
- [ ] Add Replit and RunPod proof-of-use documents under submission/.
- [ ] Confirm and document the actual RunPod deployment and GPU test status.
- [ ] Verify the run instructions and tests in the intended environment.
- [ ] Check that no API keys or other secrets are committed.
## License
This project is licensed under the [Apache License 2.0](LICENSE).
