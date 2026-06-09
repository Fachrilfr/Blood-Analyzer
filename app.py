from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from ultralytics import YOLO
import cv2
import numpy as np
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from datetime import datetime

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image as RLImage, Table, TableStyle
)
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors

app = Flask(__name__, static_folder='dist', static_url_path='', template_folder='dist')

# --------------------- Model ----------------------
model = YOLO("runs/detect/train/weights/best.pt")

CLASS_NAMES = {
    0: "Platelets",
    1: "RBC",
    2: "WBC"
}

COLORS = {
    "Platelets": (255, 215, 0),
    "RBC":       (220, 53, 69),
    "WBC":       (30, 144, 255)
}

# ---------------------- Normal Range ----------------------
# Satuan: jumlah sel per frame mikroskop (estimasi dari dataset BCCD)
# Disesuaikan untuk citra mikroskop 640x480 standard
NORMAL_RANGE = {
    "RBC":      {"min": 25, "max": 60,  "unit": "sel/frame", "full_name": "Red Blood Cells"},
    "WBC":      {"min": 1,  "max": 5,   "unit": "sel/frame", "full_name": "White Blood Cells"},
    "Platelets":{"min": 5,  "max": 25,  "unit": "sel/frame", "full_name": "Platelets"}
}

# ---------------------- Paths -----------------------
OUTPUT_DIR = "static/output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

PROCESSED_IMAGE = os.path.join(OUTPUT_DIR, "processed.jpg")
CHART_IMAGE     = os.path.join(OUTPUT_DIR, "chart.png")
PDF_REPORT      = os.path.join(OUTPUT_DIR, "blood_report.pdf")

# ----------------------- Global Storage ----------------
latest_counts    = {}
latest_boxes     = {}
latest_analysis  = {}
batch_results    = []

# -------------------- Helper: Status -------------------------
def get_status(cell_type, count):
    rng = NORMAL_RANGE[cell_type]
    if count < rng["min"]:
        return "low"
    elif count > rng["max"]:
        return "high"
    else:
        return "normal"

def get_status_label(status):
    return {"low": "Rendah", "normal": "Normal", "high": "Tinggi"}.get(status, "-")

# -------------------- Helper: Diagnosis ----------------------
def generate_diagnosis(counts):
    findings = []
    conditions = []

    rbc_status = get_status("RBC", counts["RBC"])
    wbc_status = get_status("WBC", counts["WBC"])
    plt_status = get_status("Platelets", counts["Platelets"])

    # RBC interpretation
    if rbc_status == "low":
        findings.append("Jumlah RBC rendah, kemungkinan indikasi <b>anemia</b> atau kekurangan sel darah merah.")
        conditions.append("Potensi Anemia")
    elif rbc_status == "high":
        findings.append("Jumlah RBC tinggi, kemungkinan indikasi <b>polisitemia</b> atau dehidrasi.")
        conditions.append("Potensi Polisitemia")

    # WBC interpretation
    if wbc_status == "low":
        findings.append("Jumlah WBC rendah, kemungkinan indikasi <b>leukopenia</b> yang dapat melemahkan imunitas.")
        conditions.append("Potensi Leukopenia")
    elif wbc_status == "high":
        findings.append("Jumlah WBC meningkat, kemungkinan terjadi <b>infeksi</b> atau respons inflamasi.")
        conditions.append("Potensi Infeksi/Inflamasi")

    # Platelet interpretation
    if plt_status == "low":
        findings.append("Jumlah Platelet rendah, kemungkinan indikasi <b>trombositopenia</b> dengan risiko perdarahan.")
        conditions.append("Potensi Trombositopenia")
    elif plt_status == "high":
        findings.append("Jumlah Platelet tinggi, kemungkinan indikasi <b>trombositosis</b>.")
        conditions.append("Potensi Trombositosis")

    if not findings:
        findings.append("Jumlah semua tipe sel berada dalam rentang normal untuk citra mikroskop ini.")

    overall = "normal" if not conditions else ("warning" if len(conditions) == 1 else "danger")

    return {
        "findings": findings,
        "conditions": conditions,
        "overall": overall
    }

# -------------------- Helper: Percentage ---------------------
def get_percentages(counts):
    total = sum(counts.values())
    if total == 0:
        return {k: 0 for k in counts}
    return {k: round(v / total * 100, 1) for k, v in counts.items()}

# -------------------- Helper: Run Prediction -----------------
def run_prediction(img):
    results = model(img)[0]
    counts = {name: 0 for name in CLASS_NAMES.values()}
    boxes_data = []

    for box in results.boxes:
        cls_id     = int(box.cls[0])
        conf       = float(box.conf[0])
        class_name = CLASS_NAMES[cls_id]
        counts[class_name] += 1

        x1, y1, x2, y2 = map(int, box.xyxy[0])
        color = COLORS[class_name]

        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        label = f"{class_name} {conf*100:.1f}%"
        cv2.putText(img, label, (x1, max(y1-8, 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 2)

        boxes_data.append({
            "x": x1, "y": y1,
            "w": x2 - x1, "h": y2 - y1,
            "label": class_name,
            "confidence": round(conf * 100, 1),
            "color": f"rgb{color}"
        })

    return counts, boxes_data, img

# -------------------- Routes --------------------------
@app.route("/")
def index():
    if os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    if os.path.exists('templates/index.html'):
        return render_template("index.html")
    return "Frontend React build not found. Please run 'npm run build' first."

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

# ----------------- Single Prediction -------------------------
@app.route("/predict", methods=["POST"])
def predict():
    global latest_counts, latest_boxes, latest_analysis

    file     = request.files["image"]
    img_bytes = file.read()
    nping    = np.frombuffer(img_bytes, np.uint8)
    img      = cv2.imdecode(nping, cv2.IMREAD_COLOR)

    counts, boxes_data, img_annotated = run_prediction(img)
    cv2.imwrite(PROCESSED_IMAGE, img_annotated)

    latest_counts   = counts
    latest_boxes    = boxes_data

    # Build analysis
    percentages = get_percentages(counts)
    status_map  = {k: get_status(k, v) for k, v in counts.items()}
    diagnosis   = generate_diagnosis(counts)

    latest_analysis = {
        "counts":      counts,
        "percentages": percentages,
        "status":      status_map,
        "status_label": {k: get_status_label(v) for k, v in status_map.items()},
        "normal_range": NORMAL_RANGE,
        "diagnosis":   diagnosis
    }

    return jsonify({
        "counts":      counts,
        "boxes":       boxes_data,
        "image":       PROCESSED_IMAGE,
        "percentages": percentages,
        "status":      status_map,
        "status_label": latest_analysis["status_label"],
        "normal_range": NORMAL_RANGE,
        "diagnosis":   diagnosis
    })

# ----------------- Batch Prediction -------------------------
@app.route("/predict-batch", methods=["POST"])
def predict_batch():
    global batch_results
    batch_results = []
    files = request.files.getlist("images")

    if not files:
        return jsonify({"error": "No images uploaded"}), 400

    for i, file in enumerate(files):
        img_bytes = file.read()
        nping     = np.frombuffer(img_bytes, np.uint8)
        img       = cv2.imdecode(nping, cv2.IMREAD_COLOR)

        if img is None:
            continue

        counts, boxes_data, img_annotated = run_prediction(img)

        # Save each processed image
        out_path = os.path.join(OUTPUT_DIR, f"batch_{i}.jpg")
        cv2.imwrite(out_path, img_annotated)

        percentages = get_percentages(counts)
        status_map  = {k: get_status(k, v) for k, v in counts.items()}
        diagnosis   = generate_diagnosis(counts)

        batch_results.append({
            "filename":    file.filename,
            "index":       i,
            "image":       out_path,
            "counts":      counts,
            "percentages": percentages,
            "status":      status_map,
            "status_label": {k: get_status_label(v) for k, v in status_map.items()},
            "diagnosis":   diagnosis
        })

    return jsonify({"results": batch_results, "total": len(batch_results)})

# -------------------- CHART ---------------------
def generate_chart(counts):
    fig, axes = plt.subplots(1, 2, figsize=(9, 4))
    fig.patch.set_facecolor('#FFFDF5')

    cell_types = list(counts.keys())
    values     = list(counts.values())
    bar_colors = ['#DC3545', '#1E6BFF', '#FFD60A']

    # Bar chart
    axes[0].bar(cell_types, values, color=bar_colors, edgecolor='black', linewidth=1.5)
    axes[0].set_title('Cell Count', fontweight='bold', fontsize=12)
    axes[0].set_ylabel('Count')
    axes[0].set_facecolor('#F5F0E8')

    # Normal range markers
    for j, ct in enumerate(cell_types):
        rng = NORMAL_RANGE[ct]
        axes[0].hlines(rng["min"], j-0.4, j+0.4, colors='green', linestyles='--', linewidth=1, label='Normal min' if j==0 else '')
        axes[0].hlines(rng["max"], j-0.4, j+0.4, colors='red',   linestyles='--', linewidth=1, label='Normal max' if j==0 else '')

    axes[0].legend(fontsize=8)

    # Pie chart
    filtered = {k: v for k, v in counts.items() if v > 0}
    if filtered:
        axes[1].pie(filtered.values(), labels=filtered.keys(),
                    autopct='%1.1f%%', colors=bar_colors[:len(filtered)],
                    startangle=90, wedgeprops={'edgecolor':'black','linewidth':1.5})
        axes[1].set_title('Distribution (%)', fontweight='bold', fontsize=12)

    plt.tight_layout()
    plt.savefig(CHART_IMAGE, facecolor='#FFFDF5', dpi=120)
    plt.close()

# ------------------ PDF ------------------
def generate_pdf():
    doc    = SimpleDocTemplate(PDF_REPORT, pagesize=A4)
    styles = getSampleStyleSheet()
    story  = []

    # Title
    story.append(Paragraph("<b>AI Hematology Analysis Report</b>", styles["Title"]))
    story.append(Spacer(1, 8))
    date_str = datetime.now().strftime("%d %B %Y | %H:%M WIB")
    story.append(Paragraph(f"Generated: {date_str}", styles["Normal"]))
    story.append(Spacer(1, 16))

    # Image
    story.append(Paragraph("<b>Processed Blood Smear</b>", styles["Heading2"]))
    story.append(RLImage(PROCESSED_IMAGE, width=400, height=250))
    story.append(Spacer(1, 12))

    # Summary table with status
    story.append(Paragraph("<b>Detection Summary & Normal Range</b>", styles["Heading2"]))
    table_data = [["Cell Type", "Count", "Normal Range", "Status"]]
    status_colors_map = {"normal": colors.green, "low": colors.orange, "high": colors.red}

    for cell, count in latest_counts.items():
        rng    = NORMAL_RANGE[cell]
        status = get_status(cell, count)
        table_data.append([
            cell,
            str(count),
            f"{rng['min']} – {rng['max']} {rng['unit']}",
            get_status_label(status)
        ])

    t = Table(table_data, colWidths=[120, 60, 160, 80])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.black),
        ('TEXTCOLOR',  (0,0), (-1,0), colors.white),
        ('FONTNAME',   (0,0), (-1,0), 'Helvetica-Bold'),
        ('GRID',       (0,0), (-1,-1), 1, colors.black),
        ('FONTSIZE',   (0,0), (-1,-1), 10),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.Color(0.95,0.95,0.95)])
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    # Diagnosis
    if latest_analysis:
        story.append(Paragraph("<b>AI Interpretation</b>", styles["Heading2"]))
        for finding in latest_analysis["diagnosis"]["findings"]:
            clean = finding.replace('<b>','').replace('</b>','')
            story.append(Paragraph(f"• {clean}", styles["Normal"]))
        story.append(Spacer(1, 12))

    # Chart
    story.append(Paragraph("<b>Distribution Chart</b>", styles["Heading2"]))
    story.append(RLImage(CHART_IMAGE, width=420, height=200))
    story.append(Spacer(1, 20))

    # Disclaimer
    story.append(Paragraph(
        "<i>⚠️ DISCLAIMER: Laporan ini dihasilkan oleh sistem AI berbasis YOLO dan "
        "hanya untuk keperluan riset dan edukasi. Bukan merupakan diagnosis medis final. "
        "Konsultasikan selalu dengan tenaga medis profesional.</i>",
        styles["Normal"]
    ))

    doc.build(story)

# ------------------------ Download --------------------
@app.route("/download-report")
def download_report():
    if not latest_counts:
        return "No report available. Please analyze an image first.", 400
    generate_chart(latest_counts)
    generate_pdf()
    return send_file(PDF_REPORT, as_attachment=True)

# --------------------- Main ---------------------------
if __name__ == "__main__":
    app.run(debug=True)