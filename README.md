# ✦ MyTask Space

A personal productivity web app built with **Flask + SQLite**.  
Each user has a private account — their timetable, notes, todos and weekly planner are completely separate from everyone else.

---

## ✨ Features

- 🔐 **Secure login & registration** — passwords hashed with Werkzeug, never stored as plain text
- 📅 **Daily timetable** — add, edit, delete rows with custom colors & AM/PM times
- 📅 **Weekly planner** — plan Monday–Sunday with tasks per day
- 📝 **Sticky notes** — up to 8 notes, 4 on each side
- ✅ **To-Do list** — checkboxes, edit, delete, save/cancel
- 🎨 **6 background themes** — white, black, yellow, pink, blue, green
- 💾 **All data is private** — tied to your account via SQLite user_id

---

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/mytaskspace.git
cd mytaskspace

# 2. Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run
python app.py

# 5. Open browser
# http://127.0.0.1:5000
```

---

## 📁 Project Structure

```
mytaskspace/
├── app.py                  # Flask app — all routes + SQLite logic
├── requirements.txt        # Flask, Flask-Login, Werkzeug
├── .gitignore              # data.db excluded — each user gets their own
├── templates/
│   ├── login.html          # Login page
│   ├── register.html       # Register page
│   └── index.html          # Main app
└── static/
    ├── css/
    │   ├── auth.css        # Login/register styles
    │   └── style.css       # Main app styles
    └── js/
        └── app.js          # All frontend logic
```

---

## 🔒 Security

- Passwords stored as **bcrypt-style hashes** via Werkzeug — never as plain text
- Every API route uses `@login_required` — unauthenticated requests are rejected
- Every DB query filters by `user_id = current_user.id` — users can only access their own data
- `.gitignore` ensures `data.db` is never committed to GitHub

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3 + Flask |
| Auth | Flask-Login + Werkzeug |
| Database | SQLite (built-in Python) |
| Frontend | Vanilla HTML + CSS + JS |
| Fonts | Google Fonts |

---

## 🔮 Future Plans

- [ ] Deploy to Render (free hosting)
- [ ] Password reset via email
- [ ] Export timetable to PDF
- [ ] Mobile responsive layout
- [ ] Dark mode per user preference

---

## 📄 License

MIT — free to use, fork, and build on.
