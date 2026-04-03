✦ MyTask Space

A personal productivity web app where every user gets their own private workspace to plan their day, manage tasks and stay organised — all in one place.

## ✨ Features

- 🔐 **User Authentication** — Secure register & login with hashed passwords
- 📅 **Daily Timetable** — Add time slots with tasks and color labels, sorted automatically
- 🗓️ **Weekly Planner** — Plan tasks across Monday to Sunday with time and color
- 📝 **Sticky Notes** — Up to 8 sticky notes, auto-placed left and right
- ✅ **To-Do List** — Add, edit, check off, and save your to-dos
- 🎨 **Background Themes** — Switch between White, Black, Yellow, Pink, Blue, and Green
- 📄 **PDF Export** — Download your Daily or Weekly planner as a printable PDF
- 🗑️ **Delete Account** — Permanently remove your account and all data
- 💾 **Per-User Data** — All data is private and isolated per account

---

## 🛠️ Tech Stack

| Layer    | Technology                 |
|----------|----------------------------|
| Backend  | Flask (Python)             |
| Auth     | Flask-Login + Werkzeug     |
| Database | SQLite                     |
| Frontend | HTML, CSS, JavaScript      |
| Server   | Gunicorn                   |
| Deploy   | Railway                    |

---

## 📁 Project Structure
mytaskspace/
├── app.py
├── requirements.txt
├── Procfile
├── README.md
├── .gitignore
├── templates/
│   ├── index.html
│   ├── login.html
│   └── register.html
└── static/
├── css/
│   ├── style.css
│   └── auth.css
└── js/
└── app.js
---


## 🌐 Deploy on Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repo — Railway detects the `Procfile` automatically
4. Add `SECRET_KEY` as an environment variable in the **Variables** tab
5. App is live.

---

## 🔒 Security

- Passwords are hashed using Werkzeug — never stored as plain text
- All routes are protected with Flask-Login
- Each user's data is fully isolated
- `SECRET_KEY` is loaded from environment variables in production

---
y
📌 Note
This is a portfolio project. Please do not store sensitive personal information.