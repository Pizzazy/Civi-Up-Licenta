# CiviUp Backend

Production-ready **FastAPI** backend for the **CiviUp** NGO management platform, connected to **Supabase** (Postgres + Auth + Storage).

---

## Prerequisites

| Dependency | Version |
|---|---|
| Python | 3.11+ |
| pip | latest |
| Tesseract OCR | *(optional, for receipt scanning)* |

### Install Tesseract (optional — OCR features)

- **Windows**: Download from https://github.com/UB-Mannheim/tesseract/wiki and add to PATH.
- **macOS**: `brew install tesseract tesseract-lang`
- **Linux (Debian)**: `sudo apt install tesseract-ocr tesseract-ocr-ron`

---

## Quick Start

```bash
# 1. Navigate to the backend folder
cd backend

# 2. Create & activate virtual environment
python -m venv venv
venv\Scripts\activate     # Windows
# source venv/bin/activate  # macOS / Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and fill in environment variables
copy .env.example .env    # Windows
# cp .env.example .env    # macOS / Linux

# 5. Run the server
uvicorn app.main:app --reload --port 8000
```

The API is available at **http://localhost:8000** and docs at **http://localhost:8000/docs**.

---

## Database Migrations

When backend endpoints are extended with new DB fields, run the SQL migration in Supabase SQL Editor.

For the Financiar document workflow fields, run:

- `migrations/20260318_finance_documents_columns.sql`

This migration adds these columns to both `expenses` and `donations`:

- `document_type`
- `invoice_url`
- `proof_url`
- `payment_status`

If this migration is not applied, create/update operations for finance records can fail with schema cache errors (for example: missing `document_type`).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (bypasses RLS) |
| `JWT_SECRET` | ✅ | Same as Supabase JWT secret |
| `JWT_ALGORITHM` | | `HS256` (default) |
| `APP_ENV` | | `development` or `production` |
| `APP_PORT` | | Default `8000` |
| `CORS_ORIGINS` | | Comma-separated origins for production |
| `TESSERACT_CMD` | | Path to tesseract binary |
| `ANTHROPIC_API_KEY` | | For AI-generated social post text |

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py            # Settings from .env
│   ├── database.py          # Supabase clients (anon + admin)
│   ├── dependencies.py      # JWT auth, RBAC helpers
│   ├── main.py              # FastAPI app, CORS, router includes
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py          # Login, logout, refresh, /me
│   │   ├── users.py         # Profiles CRUD, account requests
│   │   ├── projects.py      # Projects CRUD + members + stats
│   │   ├── expenses.py      # Expenses CRUD + approve/reject
│   │   ├── donations.py     # Donations CRUD + summary
│   │   ├── tasks.py         # Tasks CRUD + memos
│   │   ├── calendar.py      # Calendar events CRUD
│   │   ├── chat.py          # Direct messages, conversations
│   │   ├── emails.py        # Internal emails + templates
│   │   ├── social.py        # Social posts + AI text generation
│   │   ├── ocr.py           # Receipt upload & OCR processing
│   │   └── dashboard.py     # Aggregate dashboard endpoints
│   └── schemas/
│       ├── __init__.py
│       ├── user.py
│       ├── project.py
│       ├── expense.py
│       ├── donation.py
│       ├── task.py
│       ├── calendar.py
│       ├── chat.py
│       ├── email.py
│       ├── social.py
│       └── dashboard.py
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

---

## API Endpoints

All routes are prefixed with `/api`.

### System
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |

### Auth (`/api/auth`)
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Sign in with email + password |
| POST | `/api/auth/logout` | Sign out |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user profile |

### Users (`/api/users`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/users` | List all users *(CEO)* |
| GET | `/api/users/{id}` | Get user by ID |
| PUT | `/api/users/{id}` | Update user (own or CEO) |
| DELETE | `/api/users/{id}` | Deactivate user *(CEO)* |
| POST | `/api/users/account-requests` | Submit account request *(public)* |
| GET | `/api/users/account-requests` | List requests *(CEO)* |
| PATCH | `/api/users/account-requests/{id}/approve` | Approve *(CEO)* |
| PATCH | `/api/users/account-requests/{id}/reject` | Reject *(CEO)* |

### Projects (`/api/projects`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/projects` | List projects (filter by status) |
| GET | `/api/projects/{id}` | Get project with stats |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/{id}` | Update project |
| DELETE | `/api/projects/{id}` | Delete project *(CEO)* |
| POST | `/api/projects/{id}/members` | Add member |
| DELETE | `/api/projects/{id}/members/{uid}` | Remove member |
| GET | `/api/projects/{id}/stats` | Financial stats |

### Expenses (`/api/expenses`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/expenses` | List (filter by project, status, dates) |
| GET | `/api/expenses/{id}` | Get by ID |
| POST | `/api/expenses` | Create expense |
| PUT | `/api/expenses/{id}` | Update expense |
| PATCH | `/api/expenses/{id}/approve` | Approve *(finance)* |
| PATCH | `/api/expenses/{id}/reject` | Reject *(finance)* |
| DELETE | `/api/expenses/{id}` | Delete (finance or own pending) |

### Donations (`/api/donations`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/donations` | List (filter by project, category, dates) |
| GET | `/api/donations/summary` | Aggregated summary |
| POST | `/api/donations` | Create donation |
| PUT | `/api/donations/{id}` | Update donation |
| DELETE | `/api/donations/{id}` | Delete *(CEO)* |

### Tasks (`/api/tasks`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/tasks` | List tasks (filter by project, assignee, status) |
| GET | `/api/tasks/{id}` | Get with memos |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/{id}` | Update task |
| PATCH | `/api/tasks/{id}/status` | Change status |
| DELETE | `/api/tasks/{id}` | Delete *(PM)* |
| POST | `/api/tasks/{id}/memos` | Add memo |
| GET | `/api/tasks/{id}/memos` | List memos |
| DELETE | `/api/tasks/{tid}/memos/{mid}` | Delete memo |

### Calendar (`/api/calendar`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/calendar` | List events (filter by project, month) |
| POST | `/api/calendar` | Create event |
| PUT | `/api/calendar/{id}` | Update event |
| DELETE | `/api/calendar/{id}` | Delete event |

### Chat (`/api/chat`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/chat/conversations` | List conversations |
| GET | `/api/chat/messages/{user_id}` | Get messages with user |
| POST | `/api/chat/messages/{user_id}` | Send message |
| PATCH | `/api/chat/messages/{user_id}/read` | Mark as read |
| DELETE | `/api/chat/messages/{id}` | Soft-delete message |

### Emails (`/api/emails`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/emails` | List (filter by column, starred) |
| GET | `/api/emails/{id}` | Get by ID |
| POST | `/api/emails` | Create/send email |
| PATCH | `/api/emails/{id}/column` | Move column |
| PATCH | `/api/emails/{id}/read` | Mark read |
| PATCH | `/api/emails/{id}/star` | Toggle star |
| DELETE | `/api/emails/{id}` | Delete email |
| GET | `/api/emails/templates` | List templates |
| POST | `/api/emails/templates` | Create template |
| PUT | `/api/emails/templates/{id}` | Update template |
| DELETE | `/api/emails/templates/{id}` | Delete template |

### Social (`/api/social`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/social` | List posts |
| GET | `/api/social/analytics` | Analytics summary |
| POST | `/api/social` | Create post |
| PUT | `/api/social/{id}` | Update post |
| DELETE | `/api/social/{id}` | Delete post |
| POST | `/api/social/generate-ai-text` | Generate text via AI |

### OCR (`/api/ocr`)
| Method | Path | Description |
|---|---|---|
| POST | `/api/ocr/process` | Upload receipt & extract data |

### Dashboard (`/api/dashboard`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Organization-wide summary |
| GET | `/api/dashboard/financial-monthly` | Monthly breakdown |
| GET | `/api/dashboard/beneficiari-by-project` | Beneficiaries per project |
| GET | `/api/dashboard/recent-activity` | Recent activity feed |

---

## Roles (RBAC)

| Role | Description |
|---|---|
| `ceo` | Full access — manages users, approves accounts |
| `project_manager` | Manages projects, tasks, members |
| `financial_officer` | Manages expenses, donations, approvals |
| `communications` | Social media, emails |
| `volunteer_coordinator` | Volunteer management |
| `community_manager` | Community activities |
| `voluntar` | Volunteer — limited access |
| `cititor` | Read-only access |

---

## License

Internal project — Universitatea de Vest Timișoara — Licență 2025.
