# AI Handover Index

Last updated: 2026-05-29

This directory contains the handover package for future AI agents and human collaborators. It is intentionally explicit so a new session can continue the project without needing the prior chat history.

Read these files in this order:

1. [CURRENT_STATUS.md](./CURRENT_STATUS.md)  
   Current state, known pending work, production URL, and next priorities.

2. [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md)  
   Product context, business goals, MVP scope, completed features, limitations, roadmap, and glossary.

3. [ARCHITECTURE.md](./ARCHITECTURE.md)  
   Technical architecture for Next.js, Supabase, Resend, Vercel, auth, booking, notifications, RLS, and multi-tenant direction.

4. [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md)  
   Local setup, commands, environment variables, Supabase workflow, deployment workflow, troubleshooting, and lessons learned.

5. [AI_COLLABORATION_PROTOCOL.md](./AI_COLLABORATION_PROTOCOL.md)  
   Mandatory rules for AI agents collaborating on the same repo without overwriting each other.

6. [DEPLOYMENT_AND_OPERATIONS.md](./DEPLOYMENT_AND_OPERATIONS.md)  
   Operational setup, release checklist, rollback approach, DNS/email/domain notes, and production guardrails.

Related existing docs:

- [PROJECT_RECOVERY.md](./PROJECT_RECOVERY.md): previous recovery notes and local continuity details.
- [deployment.md](./deployment.md): earlier deployment notes.
- [email-setup.md](./email-setup.md): earlier Resend/email setup notes.
- [supabase-setup.md](./supabase-setup.md): earlier Supabase setup notes.
- [mvp-roadmap.md](./mvp-roadmap.md): earlier MVP planning.
- [product-design-notes.md](./product-design-notes.md): earlier product/design notes.

Security rule:

- Never put secrets, tokens, passwords, API keys, Supabase service keys, Resend keys, Google keys, or private access URLs in these docs.
- Environment variable names are safe to document. Environment variable values are not.

