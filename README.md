# NormalizerPro — DBMS Normalization Tool

> Web-Based Relational Database Normalization Tool  
> Course: 2CS505CC23 | Authors: Meet Kotecha & Rathod Dhruvraj | Guide: Prof. Monika Shah

---

## 📁 Project Structure

```
├── frontend/          ← Deploy to Vercel (static site)
│   ├── index.html
│   ├── vercel.json
│   ├── css/style.css
│   ├── js/
│   │   ├── algorithms.js
│   │   ├── app.js
│   │   └── ui.js
│   ├── split.js
│   ├── logo.png
│   └── background.mp4
│
├── backend/           ← Deploy to Render (Flask API)
│   ├── app.py
│   ├── requirements.txt
│   └── .python-version
```

---

## 🚀 Deployment

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Framework Preset: **Other**
5. Click **Deploy**

### Backend → Render (Free Web Service)

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. **Runtime**: Python
5. **Build Command**: `pip install -r requirements.txt`
6. **Start Command**: `gunicorn app:app`
7. **Instance Type**: Select **Free**
8. Click **Create Web Service**

> **Note:** On Render's free tier, the service will spin down after 15 min of inactivity and cold-start on the next request (~30s).

---

## 🖥️ Run Locally

### Frontend
```bash
cd frontend
python -m http.server 8080
# Open http://localhost:8080
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
# API running at http://localhost:5000
```

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | API info |
| `/api/health` | GET | Health check |
