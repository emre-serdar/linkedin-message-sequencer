# LinkedIn Message Sequencer

## Project Overview

This project is a LinkedIn Message Sequencer tool for automating the outreach process based on scheduled messaging sequences. Users can upload prospects via CSV, build a multi-step messaging sequence, and track sending statuses.

Since real LinkedIn messaging API access is highly restricted to partners, this project uses mocked login and messaging flows to simulate real behavior while focusing on system architecture and rate-limited scheduling.

---

## Planned System Architecture

- **Frontend (client/)**: Next.js app for login, prospect upload, sequence builder, and dashboard.
- **Backend (server/)**: Express.js API server for authentication, sequence management, job scheduling, and database interactions.
- **Worker (worker/)**: BullMQ-based worker service to process background messaging jobs with rate limits.
- **Database**: PostgreSQL for data storage (prospects, sequences, statuses).
- **Queue**: Redis for job management and scheduling.
- **Containerization**: Docker and Docker Compose for local development.

---

## Git Workflow Strategy

- **Main Branch**: Production-ready, deployable code.
- **Develop Branch**: Active development branch for building and testing features.
- **Feature Branches (optional)**: In a real-world scenario, feature-specific branches like `feature/auth-api` and `feature/queue-worker` would be created off `develop` for isolated development and easier pull requests. For simplicity in this trial project, all work will be merged directly into `develop`.

---

## Initial Setup Plan

1. Set up Docker Compose to spin up PostgreSQL, Redis, Client, Server, and Worker containers.
2. Bootstrap Express backend and Next.js frontend.
3. Build core functionality:
   - Mock LinkedIn login.
   - CSV prospect upload with Zod validation.
   - Sequence builder to create multi-step messaging plans.
   - Background job scheduling with BullMQ and rate-limiting logic.
   - Dashboard to monitor message delivery and replies.
4. Deploy:
   - Backend: AWS EC2 (Free Tier)
   - Frontend: Vercel
5. Prepare documentation and architecture diagrams for final presentation.

---

✅ Repository initialized. Development starting on the `develop` branch.
