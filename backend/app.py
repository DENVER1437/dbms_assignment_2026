"""
NormalizerPro — Backend API Server
Flask server with CORS support for the DBMS Normalization Tool.
Deploy on Render with gunicorn.
"""

from flask import Flask, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)


@app.route("/")
def root():
    return jsonify({
        "app": "NormalizerPro",
        "version": "1.0.0",
        "status": "running",
        "description": "DBMS Normalization Tool — Backend API",
        "endpoints": {
            "/": "API info",
            "/api/health": "Health check"
        }
    })


@app.route("/api/health")
def health():
    return jsonify({
        "status": "healthy",
        "service": "NormalizerPro Backend"
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
