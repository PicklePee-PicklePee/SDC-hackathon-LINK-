# Link frontend integration contract

Use `import { request, useApi } from './api'` (adjust relative paths in subfolders).
`request(path,{method:'POST'|'PATCH'|'DELETE',body:object})` returns JSON or throws an Error. GET default.
`useApi(path, intervalMs=0)` returns `{data,error,loading,reload}`. Paths are relative to `/api`. Cookie auth is automatic; no browser bearer tokens.

All endpoints except health require Clerk sign-in. Workspace endpoints require approved membership; mutations marked OWNER require owner membership. The role switcher is presentation only and must not grant permissions.

## Account / onboarding
- GET `/me` => `{user:{id,name,email},workspaces:[{id,name,role:'owner'|'member',status:'approved'|'pending'}]}`
- POST `/workspaces` `{name,seedSamples:true}` => `{id}`. User owns this NEW workspace only.
- POST `/requests` `{code}` => `{message}`. Requires workspace join code, status pending.
- Workspace selection is client state/localStorage ID only. GET `/me` is source of membership permissions.
- GET `/w/:id/bootstrap` => `{workspace:{id,name,systemPrompt,temperature,joinCode?},role,stats:{documents,chunks,members,questions},domains:['culinary','technology','support']}`. joinCode owner only.
- GET `/w/:id/members` OWNER => `[{id,name,email,role,status,modulesCompleted,quizScore,questionCount,groundingMatch}]`. groundingMatch nullable, real mean retrieval relevance (not verified factuality).
- PATCH `/w/:id/members/:userId` OWNER `{status:'approved'|'rejected'}`. Only pending members can be changed.

## Knowledge manager OWNER (all text plain, not rendered as HTML)
- GET `/w/:id/datasets?domain=culinary|technology|support` => `[{id,title,domain,text,size,chunks,status:'pending'|'indexed',sample,revision,createdAt}]`
- POST `/w/:id/datasets` `{title,domain,text}` => dataset. .txt/.md/.csv/.json file contents read on client, max 1MB, plus raw-text editor. Reject unsupported file types visibly.
- PATCH `/w/:id/datasets/:datasetId` `{title,domain,text}` => dataset (increments revision, requires re-index).
- DELETE `/w/:id/datasets/:datasetId` => `{ok:true}`. Ask for confirmation.
- PATCH `/w/:id/settings` `{systemPrompt,temperature}` => `{ok:true}`.

## Real GPU worker OWNER (not yet connected; never simulate jobs or metrics)
- GET `/w/:id/connection` => `{configured:boolean,connected:boolean,workerUrl:string|null,health:object|null,error:string|null,setupGuide:'/docs/runpod-setup.md'}`. Health `{gpu:{name,totalGb,usedGb,utilization},model,capabilities}`. Missing URL/token means unconfigured. Endpoint URL and token configured via SERVER environment variables, not ordinary in-app secret forms.
- POST `/w/:id/connection/test` => same.
- GET `/w/:id/jobs` => `[{id,action,status:'IN_QUEUE'|'IN_PROGRESS'|'COMPLETED'|'FAILED',createdAt,elapsedSeconds,epoch,epochs,loss,lossHistory:[{step,loss}],logs:[string],gpu:object|null,error}]`. Poll useApi interval 5000; no fake histories or placeholder metrics.
- POST `/w/:id/jobs` `{action:'index'|'pipeline'}` => job. Pipeline indexes then actually LoRA fine-tunes. User must explicitly confirm compute usage before submission. Unconfigured service returns 503 meaningful message.
- POST `/w/:id/search` OWNER `{query,domain?}` => `{matches:[{datasetId,title,text,score,revision}]}` genuine vector similarities or explicit 503.

## Learner features (owners can use learner view too)
- GET `/w/:id/chat?domain=...` => `[{id,role:'user'|'assistant',content,citations:[{datasetId,title,text,score}],createdAt}]` scoped to current user.
- POST `/w/:id/chat` `{message,domain}` => `{answer,citations}`. Response ground truth supplied by GPU worker. Explicit 503 if disconnected; no made-up answer.
- GET `/w/:id/modules?domain=...` => `[{id,title,domain,description,content,duration,order,status:'completed'|'in-progress'|'locked'}]`. Sequential unlock by domain.
- POST `/w/:id/modules/:moduleId/complete` => `{ok:true}`.
- GET `/w/:id/quiz?domain=...` => `{questions:[{id,question,options:[string]}]}`. Never return correct answers ahead of submission.
- POST `/w/:id/quiz` `{domain,answers:[index,index,index,index,index]}` => `{score,results:[{question,selected,correct,explanation}],passed}` server graded, persisted.
- GET `/w/:id/sandbox?domain=...` => `{title,notice,fields:[{key,label,unit,min,max,step,value}],standardSource}`. Label examples as sample standards.
- POST `/w/:id/sandbox` `{domain,values:{key:number}}` => `{score,corrections:[string],passed}` validates on server.

Use domain filtering consistently. Include 30 clearly labeled SAMPLE SOPs, 10 per domain (seeded backend at new-workspace creation), 3 modules and 5 quiz questions per domain. Analytics start honestly empty except the actual creating owner. Do not invent people, scores, GPU numbers, or "active" pipelines.
