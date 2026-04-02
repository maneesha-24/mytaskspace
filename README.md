# ✦ MyTask Space

A full-stack personal productivity web app built using **Flask + SQLite**.  
Each user gets a private workspace to manage their daily schedule, notes, and tasks.

---

## 🚀 Live Features

- 🔐 Secure authentication (login & registration)
- 📅 Daily timetable with time slots and colors
- 📅 Weekly planner (Monday–Sunday)
- 📝 Sticky notes (up to 8 notes)
- ✅ To-do list with save & edit options
- 🎨 Multiple UI themes
- 💾 User-specific data (stored using SQLite)

---

## 🛠 Tech Stack

| Layer      | Technology |
|------------|-----------|
| Backend    | Flask (Python) |
| Auth       | Flask-Login + Werkzeug |
| Database   | SQLite |
| Frontend   | HTML, CSS, JavaScript |

---

## 📁 Project Structure
mytaskspace/
├── app.py
├── requirements.txt
├── Procfile
├── templates/
│ ├── login.html
│ ├── register.html
│ └── index.html
└── static/
├── css/
└── js/


---

## ⚙️ How to Run Locally

```bash
git clone https://github.com/YOUR_USERNAME/mytaskspace.git
cd mytaskspace

python -m venv venv
venv\Scripts\activate   # Windows
pip install -r requirements.txt

python app.py

Open:
👉 http://127.0.0.1:5000
🌐 Deployment

This project is deployed using Railway.

🔒 Security
Passwords are hashed (never stored in plain text)
All routes are protected with authentication
Data is isolated per user
📌 Note

This is a portfolio project. Avoid storing sensitive personal data.

⭐ Future Improvements
Mobile responsiveness
Dark mode auto detection
PostgreSQL integration
Export timetable to PDF