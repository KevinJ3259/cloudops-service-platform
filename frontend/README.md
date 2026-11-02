# CloudOps Service Platform

**A full-stack IT Service Management (ITSM) application for managing incidents, investigating recurring problems, monitoring service performance, and documenting technical solutions.**

## Overview

CloudOps Service Platform demonstrates practical IT operations workflows through a modern web application.

The platform combines incident tracking, problem management, knowledge management, SLA monitoring, and operational analytics in one dashboard.

## Key Features

### Incident Management

- Create, view, update, and delete incidents
- Track incident severity, priority, status, and assigned teams
- Search, filter, and sort incidents
- Document work notes and incident activity
- Track incident communications and attachments
- Record resolution details and post-incident reviews

### Problem Management

- Create and manage problem records
- Document root causes, workarounds, and permanent fixes
- Link incidents to underlying problems
- Unlink incidents when necessary
- Track problem ownership, priority, and resolution status

### Recurring Incident Detection

- Identify repeated incidents based on title and category
- Display occurrence counts
- View incidents associated with recurring issues
- Support proactive problem investigation

### Knowledge Base

- Create, edit, view, and delete knowledge articles
- Organize articles by category
- Manage draft and published articles
- Document troubleshooting procedures and solutions

### SLA Monitoring and Analytics

- Monitor incident SLA deadlines
- Track escalation levels
- Analyze incidents by severity, category, and assigned team
- Review operational metrics in the dashboard

## Technology Stack

| Layer           | Technologies                 |
| --------------- | ---------------------------- |
| Frontend        | React, TypeScript, Vite, CSS |
| Backend         | ASP.NET Core Web API, C#     |
| Database        | PostgreSQL                   |
| ORM             | Entity Framework Core        |
| Hosting         | Render                       |
| Version Control | Git, GitHub                  |

## Live Application

**Frontend:** https://cloudops-frontend-3jpr.onrender.com

**Backend API:** https://cloudops-api-u6eu.onrender.com

## Running Locally

### Backend

Navigate to the backend directory:

```bash
cd backend/CloudOps.Api
dotnet restore
dotnet run
```

Configure the PostgreSQL connection string in your local development settings before running the API.

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

http://localhost:5173

The backend development API runs at:

http://localhost:5286

## Project Status

**Version:** 1.0.0

CloudOps Service Platform is a portfolio project demonstrating full-stack application development and practical IT service management workflows.

## Future Enhancements

- User authentication and role-based authorization
- Automated incident notifications
- AI-assisted incident classification
- Advanced operational reporting
- Automated problem detection and recommendations

## Developer

**Kevin Jordan**

B.S. Information Technology — Software Engineering

GitHub: https://github.com/KevinJ3259

Portfolio: https://kevin-jordan-portfolio-v2.vercel.app/
