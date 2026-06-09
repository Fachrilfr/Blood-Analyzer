# 🔬 HemaVision — AI-Powered Automated Blood Cell Analyzer

HemaVision is an advanced, full-stack medical helper web application designed to automate blood smear analysis using computer vision. By leveraging a custom-trained **YOLOv11** object detection model, the system detects, classifies, and counts three primary blood cell types: **Red Blood Cells (RBC)**, **White Blood Cells (WBC)**, and **Platelets (PLT)**. 

The application provides instant clinical-range comparisons, interactive distribution charts, batch image processing, and generates downloadable medical reports in PDF format.

---

## 🌟 Key Features

* **AI-Powered Detection**: Instantly localizes and classifies RBCs, WBCs, and Platelets using bounding boxes with real-time confidence scores.
* **Single Image Analysis**: Upload a single microscopic blood smear image to view annotated cells, distribution percentages, and clinical references.
* **Batch Mode Processing**: Process multiple smear samples simultaneously with an interactive file queue and progress tracking.
* **Reference Range Comparison**: Automatically compares counts per microscope frame against standard clinical reference ranges to highlight abnormal findings (**Low**, **Normal**, **High**).
* **AI Interpretation & Flags**: Provides automated preliminary diagnostic flags (e.g., flagging potential *Anemia*, *Leukopenia*, or *Thrombocytopenia*).
* **Interactive SVG Charts**: Renders custom responsive bar charts for cell density and donut charts for percentage distributions.
* **PDF Report Generation**: Programmatically compiles a professional hematology laboratory report containing annotations, charts, normal range tables, and clinician disclaimers.

---

## 🛠️ Technology Stack

### Backend & AI
* **Language**: Python 3.10+
* **AI Model**: YOLOv11 (Ultralytics)
* **Image Processing**: OpenCV, NumPy
* **Data Visualizations**: Matplotlib
* **Document Engine**: ReportLab (for automated PDF reporting)
* **Server Framework**: Flask

### Frontend
* **Core Framework**: React 19.x & Vite
* **Design & Icons**: Vanilla CSS (Premium Glassmorphism Design) & Lucide Icons

---

## 📁 Project Structure

```text
├── data/                    # Dataset folder (train, validation, and test subsets)
├── runs/detect/train/       # Training run logs, curves, and best.pt model weights
├── src/                     # React frontend source files
│   ├── App.jsx              # Main React interface, state, and SVG charts
│   ├── index.css            # Stylesheet containing premium UI variables & animations
│   └── main.jsx             # React entry point
├── static/                  # Shared assets for web app and Flask
├── app.py                   # Main Flask API handler (inference, PDF generator, and routing)
├── data.yaml                # Dataset annotation configuration for YOLOv11
├── train.py                 # Training script for YOLOv11
├── vite.config.js           # Vite server configuration
├── package.json             # Frontend packages and scripts
└── requirements.txt         # Backend Python packages
```

---

## 🚀 Getting Started

Follow these steps to set up and run HemaVision locally on your machine.

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** & **npm**

### 1. Clone & Set Up the Repository
```bash
# Navigate to the project root
cd "blood detection 2"
```

### 2. Backend Setup
1. Create a Python virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the Flask server:
   ```bash
   python app.py
   ```
   The Flask backend will start running on `http://127.0.0.1:5000`.

### 3. Frontend Setup
1. Open a new terminal window/tab and install Node dependencies:
   ```bash
   npm install
   ```
2. Run the Vite development server:
   ```bash
   npm run dev
   ```
   The React frontend will be available at `http://localhost:5173`. 
   
   *(Note: The frontend configures a proxy to forward API requests to `http://localhost:5000` for predictions and PDF downloads).*

---

## 🏋️ Model Training

The YOLOv11 model can be retrained or fine-tuned using the provided `train.py` script:

1. Ensure your dataset is structured inside the `data/` directory matching `data.yaml`.
2. Configure the training parameters in `train.py`:
   ```python
   from ultralytics import YOLO

   model = YOLO("yolo11n.pt") # load pre-trained model

   model.train(
       data="data.yaml",
       epochs=10,
       imgsz=640,
       batch=8,
       device="cpu"  # Change to "cuda" if Nvidia GPU is available
   )
   ```
3. Run the script:
   ```bash
   python train.py
   ```
4. The trained weights will be saved under `runs/detect/train/weights/best.pt`, which is automatically loaded by `app.py` for inference.

---

## 🔬 Reference Ranges & Interpretation

HemaVision compares counts per microscopic frame (640x480 resolution) against standard calibrated laboratory ranges:

| Cell Type | Minimum | Maximum | Unit | Flagged Abnormalities |
| :--- | :---: | :---: | :---: | :--- |
| **Red Blood Cells (RBC)** | 25 | 60 | cells/frame | Low: Anemia / High: Polycythemia |
| **White Blood Cells (WBC)** | 1 | 5 | cells/frame | Low: Leukopenia / High: Infection Response |
| **Platelets (PLT)** | 5 | 25 | cells/frame | Low: Thrombocytopenia / High: Thrombocytosis |

---

## ⚠️ Disclaimer

This software is developed for research, education, and validation purposes only. The AI-generated reports and interpretations are preliminary checks based on YOLOv11 and **do not constitute final medical diagnoses**. Always consult a certified hematology practitioner or clinical doctor for official laboratory evaluations.
