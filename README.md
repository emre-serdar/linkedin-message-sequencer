# LinkedIn Message Sequencer

## Project Overview

This project is a LinkedIn Message Sequencer tool for automating the outreach process based on scheduled messaging sequences. Users can upload prospects via CSV, build a multi-step messaging sequence, and track sending statuses.

Since real LinkedIn messaging API access is highly restricted to partners, this project uses a mocked login and messaging flow to simulate real behavior while focusing on system architecture, background processing, and safe rate-limited scheduling.

---

## Planned System Architecture

- **Frontend (client/)**: Next.js app for prospect upload, sequence builder, and dashboard.
- **Backend (server/)**: Express.js API server for authentication mock, sequence management, job scheduling, and database interactions.
- **Worker (worker/)**: BullMQ-based worker service to process background messaging jobs with strict rate limits.
- **Database**: PostgreSQL for structured storage (prospects, campaigns, sequences, statuses).
- **Queue Manager**: Redis with persistence enabled for job management and retry safety.
- **Containerization**: Docker and Docker Compose to manage all services locally and for production deployment.

---

## Git Workflow Strategy

- **Main Branch**: Production-ready, deployable code.
- **Develop Branch**: Active development branch for building and testing features.
- **Feature Branches (optional)**: In a real-world team scenario, feature-specific branches like `feature/campaign-upload` would be created off `develop` for isolated development and cleaner pull requests. For this trial project, direct work into `develop` is acceptable for simplicity.

---

## Initial Setup Plan

1. Set up Docker Compose to orchestrate PostgreSQL, Redis, Client, Server, and Worker containers.
2. Bootstrap Express backend and Next.js frontend.
3. Build core functionality:
   - Mock LinkedIn authentication flow.
   - CSV prospect upload and Zod-based validation.
   - Sequence builder to define multi-step messaging plans.
   - Background job scheduling with BullMQ and robust rate-limiting logic.
   - Dashboard to monitor messaging status and replies.
4. Deployment Plan:
   - All services (backend, frontend, worker, Redis, PostgreSQL) will be containerized.
   - The full system will be deployed into a **single AWS EC2 instance** using **Docker Compose**.
   - Vercel deployment for the frontend **may** be considered additionally if time permits.
5. Documentation:
   - Prepare architecture diagrams and technical explanations in the final README.
   - Explain real-world LinkedIn Graph API integration possibilities (separate section).

---

✅ Repository initialized.  
✅ Development actively progressing on the `develop` branch.

