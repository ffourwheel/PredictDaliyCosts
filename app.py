"""
Flask Web Application for Daily Expense Prediction
"""

from flask import Flask, request, jsonify, render_template
import sqlite3
import os
from datetime import datetime
from model import train_model, predict, get_model_status, FEATURE_NAMES, TARGET_NAME

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'expenses.db')


def get_db():
    """Get database connection."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database tables."""
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS daily_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            meals_out REAL NOT NULL,
            travel_distance REAL NOT NULL,
            shopping_score REAL NOT NULL,
            activities REAL NOT NULL,
            sleep_hours REAL NOT NULL,
            daily_expense REAL NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()


# ---------- Routes ----------

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/record', methods=['POST'])
def add_record():
    """Add a new daily record."""
    data = request.json
    try:
        conn = get_db()
        # Check for duplicate date
        existing = conn.execute(
            'SELECT id FROM daily_records WHERE date = ?', (data['date'],)
        ).fetchone()
        if existing:
            conn.close()
            return jsonify({'success': False, 'message': f'วันที่ {data["date"]} มีข้อมูลแล้ว กรุณาเลือกวันอื่น'}), 400

        conn.execute('''
            INSERT INTO daily_records (date, meals_out, travel_distance, shopping_score, activities, sleep_hours, daily_expense)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            data['date'],
            float(data['meals_out']),
            float(data['travel_distance']),
            float(data['shopping_score']),
            float(data['activities']),
            float(data['sleep_hours']),
            float(data['daily_expense']),
        ))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'บันทึกข้อมูลสำเร็จ!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400


@app.route('/api/used-dates', methods=['GET'])
def get_used_dates():
    """Get list of dates that already have records."""
    conn = get_db()
    rows = conn.execute('SELECT date FROM daily_records ORDER BY date').fetchall()
    conn.close()
    dates = [row['date'] for row in rows]
    return jsonify({'dates': dates})


@app.route('/api/records', methods=['GET'])
def get_records():
    """Get all daily records."""
    conn = get_db()
    rows = conn.execute('SELECT * FROM daily_records ORDER BY date DESC').fetchall()
    conn.close()
    records = [dict(row) for row in rows]
    return jsonify({'records': records, 'count': len(records)})


@app.route('/api/records/<int:record_id>', methods=['DELETE'])
def delete_record(record_id):
    """Delete a record by ID."""
    conn = get_db()
    conn.execute('DELETE FROM daily_records WHERE id = ?', (record_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'ลบข้อมูลสำเร็จ!'})


@app.route('/api/train', methods=['POST'])
def train():
    """Train the model with collected data."""
    conn = get_db()
    rows = conn.execute('SELECT * FROM daily_records ORDER BY date').fetchall()
    conn.close()
    
    records = [dict(row) for row in rows]
    
    if len(records) < 7:
        return jsonify({
            'success': False,
            'message': f'ต้องมีข้อมูลอย่างน้อย 7 วัน (มีอยู่ {len(records)} วัน)'
        }), 400
    
    try:
        metrics = train_model(records)
        return jsonify({'success': True, 'metrics': metrics, 'message': 'สร้างโมเดลสำเร็จ!'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/predict', methods=['POST'])
def make_prediction():
    """Predict daily expense."""
    data = request.json
    try:
        features = {name: float(data[name]) for name in FEATURE_NAMES}
        result = predict(features)
        return jsonify({'success': True, 'prediction': result})
    except FileNotFoundError:
        return jsonify({'success': False, 'message': 'กรุณาสร้างโมเดลก่อนทำนาย'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/model-status', methods=['GET'])
def model_status():
    """Get model status and metrics."""
    status = get_model_status()
    return jsonify(status)


# Initialize DB on module load (works with both flask dev server and gunicorn)
init_db()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
