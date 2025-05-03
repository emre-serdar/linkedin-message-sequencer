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

Due to API access restrictions, this project uses **mock authentication** and **simulated messaging**. Here's how it would be adapted for production using LinkedIn’s official APIs:

### 1. **Sign In with LinkedIn**
> 📚 [LinkedIn OAuth 2.0 (3-legged flow)](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)

- Use **OpenID Connect** + **r_liteprofile** + **r_emailaddress** scopes.
- After user consents, retrieve access token and use it for:
  - LinkedIn Profile (`GET /v2/me`)
  - Email Address (`GET /v2/emailAddress?q=members&projection=(elements*(handle~))`)

#### Example:
```http
GET https://api.linkedin.com/v2/me
Authorization: Bearer {access_token}
```

---

### 2. **LinkedIn Messaging API**
> 📚 [LinkedIn Messages API Overview](https://learn.microsoft.com/en-us/linkedin/shared/integrations/communications/messages)

**✅ What’s Possible with Approval**:
- Send messages to 1st-degree connections
- Reply to ongoing threads
- Attach media via digital asset uploads

**🚫 Limitations**:
- Must be tied to user’s direct interaction (e.g., click to confirm/send)
- Cannot send automated or scheduled messages
- Requires message drafts to be editable by users
- Requires LinkedIn Partner access

#### Sample Request:
```json
POST https://api.linkedin.com/v2/messages
{
  "recipients": ["urn:li:person:123ABC"],
  "body": "Hi there! 👋",
  "messageType": "MEMBER_TO_MEMBER"
}
```

---

## 🛠 Future Enhancements

If full LinkedIn API access becomes available, here’s how this project could evolve:

| Feature                      | Update Plan                                                                 |
|-----------------------------|------------------------------------------------------------------------------|
| **Authentication**          | Replace mock login with 3-legged OAuth using `Sign in with LinkedIn`        |
| **Messaging**               | Replace backend/worker queue with real-time UI confirmation via API         |
| **Rate Limiting**           | Use BullMQ rate-limiting + API token quotas                                 |
| **Attachment Support**      | Use `assets?action=registerUpload` → upload image/media → use in messages   |
| **Compliance Monitoring**   | Use LinkedIn’s [Compliance Events API] to track messaging activity          |
| **Access Control & Teams**  | Multi-user dashboard with user-specific tokens and permissions              |
| **CI/CD & Testing**         | Integrate Jest and Supertest + deploy via GitHub Actions to AWS             |

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


## 🙋 Author

**Emre Serdar**  
🌐 [www.emreserdar.com](http://www.emreserdar.com)
