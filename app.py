from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3, os, secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)   # random key every restart (fine for now)

DB_PATH = os.path.join(os.path.dirname(__file__), 'data.db')

# ── Flask-Login setup ─────────────────────────────────────────────────────────
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please log in to access your space.'
login_manager.login_message_category = 'info'

class User(UserMixin):
    def __init__(self, id_, email):
        self.id    = id_
        self.email = email

@login_manager.user_loader
def load_user(user_id):
    conn = get_db()
    row  = conn.execute('SELECT id, email FROM users WHERE id=?', (user_id,)).fetchone()
    conn.close()
    return User(row['id'], row['email']) if row else None

# ── DB helpers ────────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db(); c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        email         TEXT    UNIQUE NOT NULL,
        password_hash TEXT    NOT NULL,
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS settings (
        user_id  INTEGER NOT NULL,
        key      TEXT    NOT NULL,
        value    TEXT,
        PRIMARY KEY (user_id, key),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS timetable_rows (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL,
        time_start  TEXT    NOT NULL,
        time_end    TEXT,
        task        TEXT    NOT NULL,
        task_color  TEXT    DEFAULT '#1a1a1a',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS sticky_notes (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id  INTEGER NOT NULL,
        content  TEXT    NOT NULL,
        position TEXT    DEFAULT 'left',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS todos (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        content    TEXT    NOT NULL,
        done       INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS weekly_tasks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        day        TEXT    NOT NULL,
        time_start TEXT    NOT NULL,
        time_end   TEXT,
        task       TEXT    NOT NULL,
        task_color TEXT    DEFAULT '#1a1a1a',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')

    conn.commit(); conn.close()

def default_settings(user_id):
    """Insert default settings for a brand-new user."""
    conn = get_db()
    defaults = {'heading': 'My Daily Timetable', 'subtext': '', 'bg_theme': 'white'}
    for k, v in defaults.items():
        conn.execute('INSERT OR IGNORE INTO settings (user_id,key,value) VALUES (?,?,?)', (user_id, k, v))
    conn.commit(); conn.close()

# ── Auth routes ───────────────────────────────────────────────────────────────
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('app_main'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET','POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('app_main'))
    error = None
    if request.method == 'POST':
        email    = request.form.get('email','').strip().lower()
        password = request.form.get('password','')
        conn = get_db()
        row  = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
        conn.close()
        if row and check_password_hash(row['password_hash'], password):
            login_user(User(row['id'], row['email']), remember=True)
            return redirect(url_for('app_main'))
        error = 'Invalid email or password. Please try again.'
    return render_template('login.html', error=error)

@app.route('/register', methods=['GET','POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('app_main'))
    error = None
    if request.method == 'POST':
        email    = request.form.get('email','').strip().lower()
        password = request.form.get('password','')
        confirm  = request.form.get('confirm','')

        if not email or not password:
            error = 'Email and password are required.'
        elif len(password) < 8:
            error = 'Password must be at least 8 characters.'
        elif password != confirm:
            error = 'Passwords do not match.'
        else:
            conn = get_db()
            existing = conn.execute('SELECT id FROM users WHERE email=?', (email,)).fetchone()
            if existing:
                error = 'An account with this email already exists.'
                conn.close()
            else:
                pw_hash = generate_password_hash(password)
                cur = conn.execute('INSERT INTO users (email,password_hash) VALUES (?,?)', (email, pw_hash))
                conn.commit()
                new_id = cur.lastrowid
                conn.close()
                default_settings(new_id)
                login_user(User(new_id, email), remember=True)
                return redirect(url_for('app_main'))
    return render_template('register.html', error=error)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# ── Main app page ─────────────────────────────────────────────────────────────
@app.route('/app')
@login_required
def app_main():
    return render_template('index.html', email=current_user.email)

# ── Settings API ──────────────────────────────────────────────────────────────
@app.route('/api/settings', methods=['GET'])
@login_required
def get_settings():
    conn = get_db()
    rows = conn.execute('SELECT key,value FROM settings WHERE user_id=?', (current_user.id,)).fetchall()
    conn.close()
    return jsonify({r['key']: r['value'] for r in rows})

@app.route('/api/settings', methods=['POST'])
@login_required
def save_settings():
    conn = get_db()
    for k, v in request.json.items():
        conn.execute('INSERT OR REPLACE INTO settings (user_id,key,value) VALUES (?,?,?)', (current_user.id, k, v))
    conn.commit(); conn.close()
    return jsonify({'ok': True})

# ── Timetable rows API ────────────────────────────────────────────────────────
@app.route('/api/rows', methods=['GET'])
@login_required
def get_rows():
    conn = get_db()
    rows = conn.execute('SELECT * FROM timetable_rows WHERE user_id=? ORDER BY time_start', (current_user.id,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/rows', methods=['POST'])
@login_required
def add_row():
    d = request.json; conn = get_db()
    cur = conn.execute('INSERT INTO timetable_rows (user_id,time_start,time_end,task,task_color) VALUES (?,?,?,?,?)',
        (current_user.id, d['time_start'], d.get('time_end',''), d['task'], d.get('task_color','#1a1a1a')))
    conn.commit(); rid = cur.lastrowid; conn.close()
    return jsonify({'id': rid, 'ok': True})

@app.route('/api/rows/<int:rid>', methods=['PUT'])
@login_required
def update_row(rid):
    d = request.json; conn = get_db()
    conn.execute('UPDATE timetable_rows SET time_start=?,time_end=?,task=?,task_color=? WHERE id=? AND user_id=?',
        (d['time_start'], d.get('time_end',''), d['task'], d.get('task_color','#1a1a1a'), rid, current_user.id))
    conn.commit(); conn.close()
    return jsonify({'ok': True})

@app.route('/api/rows/<int:rid>', methods=['DELETE'])
@login_required
def delete_row(rid):
    conn = get_db()
    conn.execute('DELETE FROM timetable_rows WHERE id=? AND user_id=?', (rid, current_user.id))
    conn.commit(); conn.close()
    return jsonify({'ok': True})

# ── Sticky notes API ──────────────────────────────────────────────────────────
@app.route('/api/notes', methods=['GET'])
@login_required
def get_notes():
    conn = get_db()
    notes = conn.execute('SELECT * FROM sticky_notes WHERE user_id=?', (current_user.id,)).fetchall()
    conn.close()
    return jsonify([dict(n) for n in notes])

@app.route('/api/notes', methods=['POST'])
@login_required
def add_note():
    conn = get_db()
    count = conn.execute('SELECT COUNT(*) as c FROM sticky_notes WHERE user_id=?', (current_user.id,)).fetchone()['c']
    if count >= 8:
        conn.close()
        return jsonify({'ok': False, 'error': 'Maximum 8 sticky notes allowed'}), 400
    lc = conn.execute("SELECT COUNT(*) as c FROM sticky_notes WHERE user_id=? AND position='left'", (current_user.id,)).fetchone()['c']
    pos = 'left' if lc < 4 else 'right'
    cur = conn.execute('INSERT INTO sticky_notes (user_id,content,position) VALUES (?,?,?)', (current_user.id, request.json['content'], pos))
    conn.commit(); nid = cur.lastrowid; conn.close()
    return jsonify({'id': nid, 'position': pos, 'ok': True})

@app.route('/api/notes/<int:nid>', methods=['PUT'])
@login_required
def update_note(nid):
    conn = get_db()
    conn.execute('UPDATE sticky_notes SET content=? WHERE id=? AND user_id=?', (request.json['content'], nid, current_user.id))
    conn.commit(); conn.close()
    return jsonify({'ok': True})

@app.route('/api/notes/<int:nid>', methods=['DELETE'])
@login_required
def delete_note(nid):
    conn = get_db()
    conn.execute('DELETE FROM sticky_notes WHERE id=? AND user_id=?', (nid, current_user.id))
    conn.commit(); conn.close()
    return jsonify({'ok': True})

# ── Todos API ─────────────────────────────────────────────────────────────────
@app.route('/api/todos', methods=['GET'])
@login_required
def get_todos():
    conn = get_db()
    todos = conn.execute('SELECT * FROM todos WHERE user_id=? ORDER BY sort_order,id', (current_user.id,)).fetchall()
    conn.close()
    return jsonify([dict(t) for t in todos])

@app.route('/api/todos', methods=['POST'])
@login_required
def add_todo():
    conn = get_db()
    cur = conn.execute('INSERT INTO todos (user_id,content,done) VALUES (?,?,0)', (current_user.id, request.json['content']))
    conn.commit(); tid = cur.lastrowid; conn.close()
    return jsonify({'id': tid, 'ok': True})

@app.route('/api/todos/<int:tid>', methods=['PUT'])
@login_required
def update_todo(tid):
    d = request.json; conn = get_db()
    conn.execute('UPDATE todos SET content=?,done=? WHERE id=? AND user_id=?', (d['content'], d.get('done',0), tid, current_user.id))
    conn.commit(); conn.close()
    return jsonify({'ok': True})

@app.route('/api/todos/<int:tid>', methods=['DELETE'])
@login_required
def delete_todo(tid):
    conn = get_db()
    conn.execute('DELETE FROM todos WHERE id=? AND user_id=?', (tid, current_user.id))
    conn.commit(); conn.close()
    return jsonify({'ok': True})

# ── Weekly tasks API ──────────────────────────────────────────────────────────
@app.route('/api/weekly', methods=['GET'])
@login_required
def get_weekly():
    conn = get_db()
    tasks = conn.execute('SELECT * FROM weekly_tasks WHERE user_id=? ORDER BY day,time_start', (current_user.id,)).fetchall()
    conn.close()
    return jsonify([dict(t) for t in tasks])

@app.route('/api/weekly', methods=['POST'])
@login_required
def add_weekly():
    d = request.json; conn = get_db()
    cur = conn.execute('INSERT INTO weekly_tasks (user_id,day,time_start,time_end,task,task_color) VALUES (?,?,?,?,?,?)',
        (current_user.id, d['day'], d['time_start'], d.get('time_end',''), d['task'], d.get('task_color','#1a1a1a')))
    conn.commit(); wid = cur.lastrowid; conn.close()
    return jsonify({'id': wid, 'ok': True})

@app.route('/api/weekly/<int:wid>', methods=['PUT'])
@login_required
def update_weekly(wid):
    d = request.json; conn = get_db()
    conn.execute('UPDATE weekly_tasks SET day=?,time_start=?,time_end=?,task=?,task_color=? WHERE id=? AND user_id=?',
        (d['day'], d['time_start'], d.get('time_end',''), d['task'], d.get('task_color','#1a1a1a'), wid, current_user.id))
    conn.commit(); conn.close()
    return jsonify({'ok': True})

@app.route('/api/weekly/<int:wid>', methods=['DELETE'])
@login_required
def delete_weekly(wid):
    conn = get_db()
    conn.execute('DELETE FROM weekly_tasks WHERE id=? AND user_id=?', (wid, current_user.id))
    conn.commit(); conn.close()
    return jsonify({'ok': True})

# ── Boot ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    init_db()
    print('\n✅  MyTask Space running → http://127.0.0.1:5000\n')
    app.run(debug=True)
