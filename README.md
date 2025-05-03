# LinkedIn Message Sequencer

## 🔍 Overview

The **LinkedIn Message Sequencer** is a full-stack, containerized outreach automation tool that simulates personalized LinkedIn message campaigns using scheduled steps. While current message delivery and authentication are mocked (due to LinkedIn’s API restrictions), the system is structured in a way that it could be extended to use LinkedIn’s official Messaging and Sign-In APIs with minimal changes to the architecture.

---

## ⚙️ Architecture

| Layer        | Tech Stack                        | Description                                                                 |
|--------------|------------------------------------|-----------------------------------------------------------------------------|
| Frontend     | Next.js + TailwindCSS + TypeScript| Prospect upload, message sequence builder, and delivery dashboard          |
| Backend API  | Express.js                         | Campaign creation, mock login, DB ops, delivery tracking                   |
| Worker       | BullMQ + Redis                     | Schedules and sends messages based on delay per step (mocked logic)        |
| Database     | PostgreSQL                         | Stores campaigns, steps, prospects, delivery status, reply events          |
| Queue        | Redis                              | Manages delayed job scheduling and cancellation logic                      |
| DevOps       | Docker Compose                     | All services run in isolated containers, local-first setup                 |

---

## ✅ Features

- **CSV Upload & Validation**: Upload prospect lists and validate LinkedIn profile URLs
- **Sequence Builder**: Define a series of message steps with custom delays
- **Message Scheduling**: Delivers messages at future times via Redis-based job queues
- **Reply Simulation**: Stops all future messages to a prospect when they reply (with Redis & DB sync)
- **Status Dashboard**: View all jobs with real-time countdowns and status (PENDING, SENT, REPLIED, STOPPED)
- **Containerized Stack**: One-line setup via `docker-compose up`

---

## 🔐 Real-World LinkedIn API Integration Plan

### 🔐 LinkedIn Login – Real Scenario

- Use [3-legged OAuth 2.0](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication) to let users authenticate via LinkedIn.
- After the user grants permission, exchange the authorization code for an access token.
- Use the access token to fetch profile information:
  - `GET https://api.linkedin.com/v2/me`
  - `GET https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))`
- Required permission scopes:
  - `r_liteprofile` – retrieve first name, last name, profile image
  - `r_emailaddress` – retrieve verified email address

### ✉️ LinkedIn Messages API – Real Scenario

- Use [LinkedIn Messages API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages) to send messages to first-degree connections.
- Messages must comply with strict LinkedIn messaging rules:
  - **User-initiated**: Must be triggered by a specific member action.
  - **User approval**: Members must see and confirm/edit message before sending.
  - **No incentives**: Messages must not offer rewards.
  - **Plain text only**: No HTML is allowed in the message body.
- Send a new message:
  ```http
  POST https://api.linkedin.com/v2/messages
  Authorization: Bearer {access_token}
  {
    "recipients": ["urn:li:person:abc123"],
    "body": "Hello! This is a demo message.",
    "messageType": "MEMBER_TO_MEMBER"
  }
  ```
- Partner permissions required: `w_member_messages`

---

## 🛠 Future Enhancements

| Feature                      | Update Plan                                                                 |
|-----------------------------|------------------------------------------------------------------------------|
| **Authentication**          | Replace mock login with 3-legged OAuth using `Sign in with LinkedIn`        |
| **Messaging**               | Replace backend/worker queue with real-time UI confirmation via API         |
| **Rate Limiting**           | Use BullMQ rate-limiting + API token quotas                                 |
| **Attachment Support**      | Use `assets?action=registerUpload` → upload media → send in message         |
| **Compliance Monitoring**   | Use Compliance Events API to track real user activities                     |
| **Multi-User Support**      | Dashboard with token-based auth per user/team                               |
| **CI/CD & Testing**         | Add Jest, Supertest, GitHub Actions + EC2/Vercel deploy                     |

---

## 🧪 Local Setup

```bash
git clone https://github.com/emre-serdar/linkedin-sequencer
cd linkedin-sequencer
docker-compose up --build
```

Access:
- Frontend → `http://localhost:3000`
- Backend API → `http://localhost:4000/api`
- Redis & Postgres auto-managed in containers

---

## 📂 Project Structure

```
.
├── client/               # Frontend - Next.js
├── server/               # Backend - Express API
├── worker/               # Background worker - BullMQ
├── docker-compose.yml    # Full stack container config
├── LICENSE               # Emre’s custom license
└── README.md             # This file
```

---

## 🙋 Author

**Emre Serdar**  
🌐 [www.emreserdar.com](http://www.emreserdar.com)
