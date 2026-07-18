# BidFlow

A modern full-stack SaaS platform for creating, managing, and sharing professional business quotations.

BidFlow simplifies the complete quotation workflow by enabling businesses to manage customers, generate branded quotation PDFs, send quotations via email, and track quotation statuses from a centralized dashboard.

## Live Demo

https://bidflow-eight.vercel.app

## Features

- Secure authentication
- Customer management
- Create, edit, and manage quotations
- Professional PDF quotation generation
- Email quotations directly to customers
- Company branding with logo and digital signature
- Dashboard for quotation management
- Responsive user interface
- Cloud-based storage and database

## Tech Stack

### Frontend

- React
- TypeScript
- TanStack Start
- Tailwind CSS
- TanStack Router
- TanStack Query
- React Hook Form
- Zod

### Backend

- Supabase
  - Authentication
  - PostgreSQL Database
  - Storage
  - Row Level Security (RLS)

### PDF Generation

- React PDF

### Email Service

- Resend API

### Deployment

- Vercel

---

## Application Workflow

```text
Login
   │
   ▼
Dashboard
   │
   ├── Manage Customers
   │
   ├── Create Quotation
   │
   ├── Generate PDF
   │
   ├── Send Email
   │
   └── Track Status
```

---

## Screens

### Authentication

- User Registration
- User Login
- Protected Routes

### Dashboard

- Overview of quotations
- Customer management
- Quick actions

### Customers

- Add customer
- Edit customer
- Delete customer
- Search customers

### Quotations

- Create quotation
- Edit quotation
- Delete quotation
- Status tracking

Supported quotation statuses:

- Draft
- Sent
- Accepted
- Rejected
- Expired

### Company Settings

- Company details
- Upload logo
- Upload digital signature

---

## Project Structure

```
src/
│
├── components/
├── routes/
├── hooks/
├── lib/
├── services/
├── utils/
└── styles/
```

---

## Installation

Clone the repository

```bash
git clone <repository-url>
```

Navigate to the project

```bash
cd bidflow
```

Install dependencies

```bash
npm install
```

Create a `.env` file and add the required environment variables.

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
SUPABASE_URL=
RESEND_API_KEY=
```

Run the development server

```bash
npm run dev
```

Build the application

```bash
npm run build
```

Preview production build

```bash
npm run preview
```

---

## Future Improvements

- Invoice generation
- Payment gateway integration
- Analytics dashboard
- Client portal
- Multi-user organizations
- Role-based access control
- GST automation
- Recurring quotations
- Inventory management

---

## Why BidFlow?

The name **BidFlow** represents the complete workflow of business quotations—from creating a quotation and sending it to customers, to tracking its progress and helping businesses close deals efficiently.

---

## Author

**Shivani Salian**

B.E. Artificial Intelligence & Data Science

GitHub:  https://github.com/shivanisalian01/Bidflow

