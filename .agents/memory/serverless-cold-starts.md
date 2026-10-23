---
name: Serverless cold-start verification
description: Avoid readiness deadlocks and respect approval boundaries when testing a scale-to-zero GPU endpoint.
---

With minimum/active workers set to zero, an endpoint can legitimately have zero ready workers until a request cold-starts one. This state alone neither proves a deployment failure nor verifies that its image can start.

**Why:** Requiring an already-ready worker before submitting the first diagnostic prevented verification of an otherwise configured, idle endpoint.

**How to apply:** Obtain explicit approval for one diagnostic including cold-start costs, submit once, and poll that same job with bounded waiting and cancellation. If approval was explicitly conditional on an already-ready worker, clarify the cold-start requirement instead of silently changing the condition. Never enable always-on workers merely to satisfy a readiness check without separate approval.
