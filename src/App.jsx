import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Upload, 
  Layers, 
  FileText, 
  Download, 
  Info, 
  HelpCircle, 
  FileImage, 
  Check, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  Trash2, 
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';
import './App.css';

// Constants
const CLASS_NAMES = {
  RBC: 'RBC',
  WBC: 'WBC',
  Platelets: 'Platelets'
};

const NORMAL_RANGE = {
  RBC:       { min: 25, max: 60, unit: 'sel/frame', full_name: 'Red Blood Cells', color: '#f87171' },
  WBC:       { min: 1,  max: 5,  unit: 'sel/frame', full_name: 'White Blood Cells', color: '#60a5fa' },
  Platelets: { min: 5,  max: 25, unit: 'sel/frame', full_name: 'Platelets', color: '#facc15' }
};

function App() {
  const [activeSection, setActiveSection] = useState('home');
  
  // Single Detect States
  const [singleFile, setSingleFile] = useState(null);
  const [singlePreview, setSinglePreview] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [singleResult, setSingleResult] = useState(null);

  // Batch Detect States
  const [batchFiles, setBatchFiles] = useState([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchResults, setBatchResults] = useState(null);

  // Reset states when changing sections
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeSection]);

  // ==========================================
  // SINGLE ANALYSIS HANDLERS
  // ==========================================
  const handleSingleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSingleFile(file);
    setSinglePreview(URL.createObjectURL(file));
    setSingleResult(null);
  };

  const triggerSingleUpload = () => {
    document.getElementById('singleFileInput').click();
  };

  const handleSingleDetect = async () => {
    if (!singleFile) return;

    setIsDetecting(true);
    const formData = new FormData();
    formData.append('image', singleFile);

    try {
      const response = await fetch('/predict', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      if (response.ok) {
        setSingleResult(data);
        // Set the preview to the annotated image from the backend, adding timestamp to bust cache
        setSinglePreview(`${data.image}?t=${Date.now()}`);
      } else {
        alert(data.error || 'Terjadi kesalahan saat memproses gambar.');
      }
    } catch (err) {
      console.error(err);
      alert('Gagal menghubungi Flask server. Pastikan backend Flask berjalan.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleResetSingle = () => {
    setSingleFile(null);
    setSinglePreview(null);
    setSingleResult(null);
  };

  // ==========================================
  // BATCH PROCESSING HANDLERS
  // ==========================================
  const handleBatchFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setBatchFiles(prev => [...prev, ...files]);
    setBatchResults(null);
  };

  const triggerBatchUpload = () => {
    document.getElementById('batchFileInput').click();
  };

  const handleRemoveBatchFile = (index) => {
    setBatchFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRunBatch = async () => {
    if (!batchFiles.length) return;

    setIsBatchProcessing(true);
    setBatchProgress({ current: 0, total: batchFiles.length });

    // Fake progress simulation to give visual feedback
    let currentPct = 0;
    const progressInterval = setInterval(() => {
      setBatchProgress(prev => {
        const nextVal = Math.min(prev.current + 1, prev.total - 1);
        return { ...prev, current: nextVal };
      });
    }, 1500);

    const formData = new FormData();
    batchFiles.forEach(file => {
      formData.append('images', file);
    });

    try {
      const response = await fetch('/predict-batch', {
        method: 'POST',
        body: formData
      });
      
      clearInterval(progressInterval);
      const data = await response.json();
      
      if (response.ok) {
        setBatchProgress({ current: batchFiles.length, total: batchFiles.length });
        setTimeout(() => {
          setBatchResults(data.results);
          setIsBatchProcessing(false);
        }, 500);
      } else {
        alert(data.error || 'Terjadi kesalahan saat memproses batch.');
        setIsBatchProcessing(false);
      }
    } catch (err) {
      clearInterval(progressInterval);
      console.error(err);
      alert('Gagal menghubungi Flask server. Pastikan backend Flask berjalan.');
      setIsBatchProcessing(false);
    }
  };

  const handleResetBatch = () => {
    setBatchFiles([]);
    setBatchResults(null);
    setIsBatchProcessing(false);
  };

  // ==========================================
  // SVG CHART BUILDERS (INTERACTIVE & CUSTOM)
  // ==========================================
  const renderBarChart = (counts) => {
    const keys = ['RBC', 'WBC', 'Platelets'];
    const values = keys.map(k => counts[k] || 0);
    const maxValue = Math.max(...values, 60) * 1.15;
    
    const chartHeight = 140;
    const chartWidth = 320;
    const paddingLeft = 30;
    const paddingTop = 15;
    const barWidth = 44;
    const spacing = 55;

    const scaleY = (val) => {
      return chartHeight + paddingTop - (val / maxValue) * chartHeight;
    };

    return (
      <svg width="100%" height="185" className="bar-chart-svg">
        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const val = Math.round(maxValue * pct);
          const y = scaleY(val);
          return (
            <g key={idx}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={chartWidth + paddingLeft} 
                y2={y} 
                stroke="rgba(0,0,0,0.06)" 
                strokeDasharray="4 4" 
              />
              <text 
                x={paddingLeft - 8} 
                y={y + 4} 
                fill="#6b7280" 
                fontSize="10" 
                textAnchor="end"
                fontFamily="var(--font-display)"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Draw bars and normal range guidelines */}
        {keys.map((key, idx) => {
          const count = counts[key] || 0;
          const range = NORMAL_RANGE[key];
          const x = paddingLeft + 25 + idx * (barWidth + spacing);
          const y = scaleY(count);
          const barH = Math.max((count / maxValue) * chartHeight, 2);
          
          // Normal range markers
          const yMin = scaleY(range.min);
          const yMax = scaleY(range.max);

          return (
            <g key={key}>
              {/* Normal Range Band */}
              <rect 
                x={x - 8} 
                y={yMax} 
                width={barWidth + 16} 
                height={yMin - yMax} 
                fill="rgba(34, 197, 94, 0.05)" 
                stroke="rgba(34, 197, 94, 0.15)"
                strokeDasharray="3 3"
                rx="4"
              />

              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={range.color}
                opacity="0.85"
                rx="6"
                className="chart-bar-rect"
              />

              {/* Value top label */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                fill="#fff"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
                fontFamily="var(--font-display)"
              >
                {count}
              </text>

              {/* X label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + paddingTop + 20}
                fill="#9ca3af"
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
                fontFamily="var(--font-display)"
              >
                {key}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const renderPieChart = (counts) => {
    const total = (counts.RBC || 0) + (counts.WBC || 0) + (counts.Platelets || 0);
    if (total === 0) {
      return (
        <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Tidak ada sel terdeteksi
        </div>
      );
    }

    const getCoordinatesForPercent = (percent) => {
      const x = Math.cos(2 * Math.PI * percent);
      const y = Math.sin(2 * Math.PI * percent);
      return [x, y];
    };

    let cumulativePercent = 0;
    const slices = Object.entries(counts).map(([name, val]) => {
      if (val === 0) return null;
      const percent = val / total;
      const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
      cumulativePercent += percent;
      const [endX, endY] = getCoordinatesForPercent(cumulativePercent);

      if (percent === 1) {
        return {
          name,
          color: NORMAL_RANGE[name].color,
          path: `M 0 -0.9 A 0.9 0.9 0 1 1 -0.0001 -0.9 Z`,
          pct: '100%'
        };
      }

      const largeArcFlag = percent > 0.5 ? 1 : 0;
      const pathData = [
        `M ${startX * 0.9} ${startY * 0.9}`,
        `A 0.9 0.9 0 ${largeArcFlag} 1 ${endX * 0.9} ${endY * 0.9}`,
        `L 0 0`,
        `Z`
      ].join(' ');

      return {
        name,
        color: NORMAL_RANGE[name].color,
        path: pathData,
        pct: (percent * 100).toFixed(1) + '%'
      };
    }).filter(Boolean);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <svg width="150" height="150" viewBox="-1 -1 2 2" className="pie-chart-svg" style={{ transform: 'rotate(-90deg)' }}>
          {slices.map((slice, idx) => (
            <path
              key={idx}
              d={slice.path}
              fill={slice.color}
              className="pie-slice"
              stroke="#ffffff"
              strokeWidth="0.04"
            />
          ))}
          {/* Inner glass cut-out to make it a donut chart */}
          <circle cx="0" cy="0" r="0.45" fill="#f8fafc" stroke="var(--border)" strokeWidth="0.02" />
        </svg>
        <div className="chart-legend">
          {slices.map((slice) => (
            <div className="legend-item" key={slice.name}>
              <div className="legend-color" style={{ background: slice.color }}></div>
              <span>{slice.name} ({slice.pct})</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==========================================
  // DIAGNOSIS / CRITICAL HELPER
  // ==========================================
  const getOverallDiagIcon = (overall) => {
    switch (overall) {
      case 'normal': return <Check size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      case 'danger': return <ShieldAlert size={18} />;
      default: return null;
    }
  };

  return (
    <div className="app-container">
      {/* ======= NAVBAR ======= */}
      <nav className="navbar">
        <div className="nav-logo" onClick={() => setActiveSection('home')} style={{ cursor: 'pointer' }}>
          <div className="nav-logo-icon"></div>
          HEMA<span>VISION</span>
        </div>
        <ul className="nav-links">
          <li><span className={`nav-link ${activeSection === 'home' ? 'active' : ''}`} onClick={() => setActiveSection('home')}>Home</span></li>
          <li><span className={`nav-link ${activeSection === 'detect' ? 'active' : ''}`} onClick={() => setActiveSection('detect')}>Single Test</span></li>
          <li><span className={`nav-link ${activeSection === 'batch' ? 'active' : ''}`} onClick={() => setActiveSection('batch')}>Batch Mode</span></li>
          <li><span className={`nav-link ${activeSection === 'about' ? 'active' : ''}`} onClick={() => setActiveSection('about')}>About AI</span></li>
          <li><span className={`nav-link ${activeSection === 'how' ? 'active' : ''}`} onClick={() => setActiveSection('how')}>Workflow</span></li>
        </ul>
        <button className="nav-cta" onClick={() => setActiveSection('detect')}>Jalankan Analisis</button>
      </nav>

      <div className="main-content">
        {/* ======= HOME ======= */}
        {activeSection === 'home' && (
          <section className="fade-in">
            {/* HERO */}
            <div className="hero-section">
              <div className="hero-left">
                <div className="hero-tag">AI Hematology Analyzer</div>
                <h1 className="hero-title">
                  DETECT.<br />
                  COUNT.<br />
                  <span className="hero-accent">ANALYZE.</span>
                </h1>
                <p className="hero-desc">
                  Upgrade performa lab Anda dengan HemaVision. Deteksi instan RBC, WBC, dan Platelets 
                  langkat dengan analisis perbandingan normal range dan laporan PDF otomatis.
                </p>
                <div className="hero-actions">
                  <button className="btn btn-primary" onClick={() => setActiveSection('detect')}>
                    Single Analysis <ArrowRight size={16} />
                  </button>
                  <button className="btn btn-secondary" onClick={() => setActiveSection('batch')}>
                    Batch Processing
                  </button>
                </div>
              </div>
              <div className="hero-right">
                <div className="clinical-mockup">
                  <div className="mockup-header">
                    <div className="mockup-dots">
                      <div className="mockup-dot red"></div>
                      <div className="mockup-dot yellow"></div>
                      <div className="mockup-dot green"></div>
                    </div>
                    <div className="mockup-title">HemaVision Analyzer v11</div>
                    <div style={{ width: 30 }}></div>
                  </div>
                  <div className="mockup-body">
                    <div className="mockup-microscope">
                      <div className="microscope-grid"></div>
                      <div className="microscope-circle">
                        <div className="microscope-dot rbc md-1"></div>
                        <div className="microscope-dot wbc md-2"></div>
                        <div className="microscope-dot rbc md-3"></div>
                        <div className="microscope-dot plt md-4"></div>
                        <div className="microscope-dot rbc md-5"></div>
                      </div>
                    </div>
                    <div className="mockup-metrics">
                      <div className="mockup-metric-card">
                        <div className="mockup-metric-name" style={{ color: 'var(--rbc)' }}>RBC Count</div>
                        <div className="mockup-metric-num">42</div>
                      </div>
                      <div className="mockup-metric-card">
                        <div className="mockup-metric-name" style={{ color: 'var(--wbc)' }}>WBC Count</div>
                        <div className="mockup-metric-num">3</div>
                      </div>
                      <div className="mockup-metric-card">
                        <div className="mockup-metric-name" style={{ color: 'var(--plt)' }}>PLT Count</div>
                        <div className="mockup-metric-num">12</div>
                      </div>
                    </div>
                    <div className="mockup-terminal">
                      <div className="terminal-line">[SYS] Model YOLOv11 ready.</div>
                      <div className="terminal-line">[SYS] Waiting for smear sample upload...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STATS BAR */}
            <div className="stats-bar">
              <div className="stats-item">
                <span className="stats-num">3 Tipe</span>
                <span className="stats-label">Sel Darah Utama</span>
              </div>
              <div className="stats-item">
                <span className="stats-num">YOLOv11</span>
                <span className="stats-label">Model Deteksi AI</span>
              </div>
              <div className="stats-item">
                <span className="stats-num">PDF</span>
                <span className="stats-label">Export Laporan</span>
              </div>
              <div className="stats-item">
                <span className="stats-num">Batch</span>
                <span className="stats-label">Multi-Image Upload</span>
              </div>
            </div>
          </section>
        )}

        {/* ======= SINGLE DETECT ======= */}
        {activeSection === 'detect' && (
          <section className="page-wrapper fade-in">
            <div className="page-header">
              <div className="section-tag">— Single Analysis</div>
              <h2 className="section-title">Deteksi Sampel Darah</h2>
              <p className="page-desc">Upload satu gambar sampel darah mikroskopik untuk menganalisis kepadatan sel.</p>
            </div>

            <div className="detect-grid">
              {/* LEFT COLUMN: UPLOAD & PREVIEW */}
              <div className="upload-container">
                <div className="glass-panel">
                  <div className="panel-label">
                    <FileImage size={14} /> Upload & Preview
                  </div>
                  
                  <div className="upload-area" onClick={triggerSingleUpload}>
                    <div className="upload-icon">
                      <Upload size={32} />
                    </div>
                    <p>Klik untuk memilih file gambar</p>
                    <span>JPG, PNG atau WEBP (max 10MB)</span>
                    <input 
                      type="file" 
                      id="singleFileInput" 
                      className="hidden-file-input" 
                      accept="image/*" 
                      onChange={handleSingleFileChange} 
                    />
                  </div>

                  <div className="image-preview-wrapper">
                    {singlePreview ? (
                      <img src={singlePreview} alt="Preview darah" />
                    ) : (
                      <div className="image-placeholder">
                        <div className="image-placeholder-cross">+</div>
                        <p>Belum ada gambar terpilih</p>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button 
                      className="btn btn-primary full-width" 
                      disabled={!singleFile || isDetecting}
                      onClick={handleSingleDetect}
                    >
                      {isDetecting ? (
                        <>
                          <RefreshCw size={16} className="spin" /> Menganalisis...
                        </>
                      ) : (
                        'Jalankan Deteksi AI'
                      )}
                    </button>
                    {singlePreview && (
                      <button className="btn btn-secondary" onClick={handleResetSingle} disabled={isDetecting}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: RESULTS */}
              <div className="results-stack">
                {/* Result Counters */}
                <div className="glass-panel">
                  <div className="panel-label">
                    <Activity size={14} /> Hasil Deteksi Sel
                  </div>
                  <div className="counts-grid">
                    <div className="count-card card-rbc">
                      <div className="count-label">Red Blood Cells (RBC)</div>
                      <div className="count-val">{singleResult ? singleResult.counts.RBC : '—'}</div>
                      <div className="count-pct">
                        {singleResult ? `${singleResult.percentages.RBC}% dari total` : '0%'}
                      </div>
                    </div>

                    <div className="count-card card-wbc">
                      <div className="count-label">White Blood Cells (WBC)</div>
                      <div className="count-val">{singleResult ? singleResult.counts.WBC : '—'}</div>
                      <div className="count-pct">
                        {singleResult ? `${singleResult.percentages.WBC}% dari total` : '0%'}
                      </div>
                    </div>

                    <div className="count-card card-plt">
                      <div className="count-label">Platelets (PLT)</div>
                      <div className="count-val">{singleResult ? singleResult.counts.Platelets : '—'}</div>
                      <div className="count-pct">
                        {singleResult ? `${singleResult.percentages.Platelets}% dari total` : '0%'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Range Comparison & Dynamic Charts */}
                <div className="glass-panel">
                  <div className="panel-label">
                    <TrendingUp size={14} /> Perbandingan Nilai Referensi
                  </div>
                  <div className="table-container">
                    <table className="range-table">
                      <thead>
                        <tr>
                          <th>Tipe Sel</th>
                          <th>Hasil Deteksi</th>
                          <th>Nilai Normal</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {singleResult ? (
                          Object.entries(NORMAL_RANGE).map(([key, ref]) => {
                            const count = singleResult.counts[key] || 0;
                            const status = singleResult.status[key];
                            const label = singleResult.status_label[key];
                            return (
                              <tr key={key}>
                                <td>
                                  <div className="cell-name-info">
                                    <strong>{key}</strong>
                                    <span className="cell-full-name">{ref.full_name}</span>
                                  </div>
                                </td>
                                <td><strong>{count}</strong> {ref.unit}</td>
                                <td>{ref.min} – {ref.max} {ref.unit}</td>
                                <td>
                                  <span className={`status-badge ${status}`}>
                                    {label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="4" className="empty-row-text">
                              Silakan upload dan jalankan deteksi untuk melihat perbandingan
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {singleResult && (
                    <div className="charts-grid">
                      <div className="chart-card">
                        <div className="chart-title">Visualisasi Jumlah Sel</div>
                        {renderBarChart(singleResult.counts)}
                      </div>
                      <div className="chart-card">
                        <div className="chart-title">Persentase Distribusi</div>
                        {renderPieChart(singleResult.counts)}
                      </div>
                    </div>
                  )}
                </div>

                {/* AI diagnosis */}
                <div className="glass-panel">
                  <div className="panel-label">
                    <Award size={14} /> Interpretasi Kondisi AI
                  </div>
                  
                  {singleResult ? (
                    <div>
                      <div className={`diag-overall-box ${singleResult.diagnosis.overall}`}>
                        <div className="diag-overall-dot"></div>
                        {getOverallDiagIcon(singleResult.diagnosis.overall)}
                        <span style={{ marginLeft: 6 }}>
                          {singleResult.diagnosis.overall === 'normal' && 'Semua Parameter Normal'}
                          {singleResult.diagnosis.overall === 'warning' && 'Ditemukan Satu Indikasi Abnormal'}
                          {singleResult.diagnosis.overall === 'danger' && 'Ditemukan Beberapa Indikasi Abnormal'}
                        </span>
                      </div>
                      <div className="findings-list">
                        {singleResult.diagnosis.findings.map((finding, idx) => (
                          <div className="finding-item" key={idx}>
                            <div className="finding-icon">—</div>
                            <div 
                              className="finding-desc"
                              dangerouslySetInnerHTML={{ __html: finding }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="diag-placeholder-view">
                      Analisis sampel untuk melihat diagnosa pendahuluan
                    </div>
                  )}
                  <p className="disclaimer-text">
                    ⚠️ DISCLAIMER: Hasil analisis ini dihasilkan otomatis oleh kecerdasan buatan (AI) berbasis model YOLO 
                    dan hanya untuk tujuan pembelajaran/riset. Selalu konsultasikan dengan dokter hematologi profesional untuk diagnosa medis.
                  </p>
                </div>

                {/* Actions (Export) */}
                {singleResult && (
                  <div className="glass-panel">
                    <div className="panel-label">
                      <FileText size={14} /> Ekspor Dokumen Resmi
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Unduh lembar hasil pemeriksaan hematologi lengkap yang mencakup anotasi sel darah, grafik, referensi rentang normal, dan interpretasi sistem.
                    </p>
                    <a href="/download-report" style={{ textDecoration: 'none' }}>
                      <button className="btn btn-primary full-width">
                        <Download size={16} /> Unduh PDF Report (.pdf)
                      </button>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ======= BATCH MODE ======= */}
        {activeSection === 'batch' && (
          <section className="page-wrapper fade-in">
            <div className="page-header">
              <div className="section-tag">— Batch Mode</div>
              <h2 className="section-title">Batch Processing</h2>
              <p className="page-desc">Proses banyak citra sel darah secara simultan untuk analisis data laboratorium skala menengah.</p>
            </div>

            {/* Dropzone */}
            {!isBatchProcessing && !batchResults && (
              <div className="batch-dropzone" onClick={triggerBatchUpload}>
                <div className="batch-dropzone-inner">
                  <div className="batch-dropzone-icon">
                    <Upload size={32} />
                  </div>
                  <h3>Pilih Banyak Gambar Sekaligus</h3>
                  <p>Klik untuk memilih file citra mikroskopik darah</p>
                  <span>Mendukung upload banyak file gambar sekaligus</span>
                  <input 
                    type="file" 
                    id="batchFileInput" 
                    className="hidden-file-input" 
                    accept="image/*" 
                    multiple 
                    onChange={handleBatchFileChange} 
                  />
                </div>
              </div>
            )}

            {/* Queue Panel */}
            {batchFiles.length > 0 && !batchResults && (
              <div className="glass-panel queue-panel fade-in">
                <div className="panel-label">
                  <Layers size={14} /> Antrean File ({batchFiles.length} Gambar)
                </div>
                <div className="queue-grid">
                  {batchFiles.map((file, idx) => (
                    <div className="queue-card" key={idx}>
                      <img src={URL.createObjectURL(file)} alt={file.name} />
                      <div className="queue-name">{file.name}</div>
                      {!isBatchProcessing && (
                        <button className="queue-remove-btn" onClick={() => handleRemoveBatchFile(idx)}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!isBatchProcessing ? (
                  <div style={{ display: 'flex', gap: '14px' }}>
                    <button className="btn btn-primary" onClick={handleRunBatch}>
                      Jalankan Pemrosesan Batch ({batchFiles.length} File)
                    </button>
                    <button className="btn btn-secondary" onClick={handleResetBatch}>
                      Reset
                    </button>
                  </div>
                ) : (
                  <div className="progress-panel">
                    <div className="progress-info">
                      <span>Memproses antrean gambar...</span>
                      <span>{batchProgress.current} / {batchProgress.total} Selesai</span>
                    </div>
                    <div className="progress-container">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Batch Results Output */}
            {batchResults && (
              <div className="fade-in">
                <div className="glass-panel">
                  <div className="panel-label">
                    <Activity size={14} /> Ringkasan Analisis Batch
                  </div>
                  <div className="batch-summary-cards">
                    <div className="batch-sum-card">
                      <div className="batch-sum-num">{batchResults.length}</div>
                      <div className="batch-sum-label">Total File</div>
                    </div>
                    <div className="batch-sum-card">
                      <div className="batch-sum-num" style={{ color: 'var(--rbc)' }}>
                        {batchResults.reduce((sum, res) => sum + (res.counts.RBC || 0), 0)}
                      </div>
                      <div className="batch-sum-label">Total RBC</div>
                    </div>
                    <div className="batch-sum-card">
                      <div className="batch-sum-num" style={{ color: 'var(--wbc)' }}>
                        {batchResults.reduce((sum, res) => sum + (res.counts.WBC || 0), 0)}
                      </div>
                      <div className="batch-sum-label">Total WBC</div>
                    </div>
                    <div className="batch-sum-card">
                      <div className="batch-sum-num" style={{ color: 'var(--plt)' }}>
                        {batchResults.reduce((sum, res) => sum + (res.counts.Platelets || 0), 0)}
                      </div>
                      <div className="batch-sum-label">Total PLT</div>
                    </div>
                    <div className="batch-sum-card">
                      <div className="batch-sum-num" style={{ color: batchResults.some(r => r.diagnosis.overall !== 'normal') ? 'var(--crimson)' : '#4ade80' }}>
                        {batchResults.filter(r => r.diagnosis.overall !== 'normal').length}
                      </div>
                      <div className="batch-sum-label">Kasus Abnormal</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '14px' }}>
                    <button className="btn btn-primary" onClick={handleResetBatch}>
                      Mulai Batch Baru
                    </button>
                  </div>
                </div>

                <div className="batch-results-wrapper">
                  <div className="panel-label" style={{ marginBottom: 16 }}>
                    <Layers size={14} /> Detail Hasil Per Gambar
                  </div>
                  <div className="batch-results-grid">
                    {batchResults.map((result, idx) => (
                      <div className="batch-result-card glass-panel" style={{ padding: 0 }} key={idx}>
                        <div className="batch-result-img-wrap">
                          <img src={`${result.image}?t=${Date.now()}`} alt={result.filename} />
                        </div>
                        <div className="batch-result-body">
                          <div className="batch-result-filename">{result.filename}</div>
                          
                          <div className="batch-result-counts">
                            <div className="batch-count-pill b-rbc">
                              <div className="batch-count-name">RBC</div>
                              <div className="batch-count-num">{result.counts.RBC}</div>
                              <div className="batch-count-pct">{result.percentages.RBC}%</div>
                            </div>
                            <div className="batch-count-pill b-wbc">
                              <div className="batch-count-name">WBC</div>
                              <div className="batch-count-num">{result.counts.WBC}</div>
                              <div className="batch-count-pct">{result.percentages.WBC}%</div>
                            </div>
                            <div className="batch-count-pill b-plt">
                              <div className="batch-count-name">PLT</div>
                              <div className="batch-count-num">{result.counts.Platelets}</div>
                              <div className="batch-count-pct">{result.percentages.Platelets}%</div>
                            </div>
                          </div>

                          <div className="batch-status-row">
                            {Object.entries(result.status_label).map(([cell, label]) => {
                              const status = result.status[cell];
                              return (
                                <span className={`status-badge ${status}`} style={{ fontSize: '9px', padding: '2px 8px' }} key={cell}>
                                  {cell}: {label}
                                </span>
                              );
                            })}
                          </div>

                          <div className="batch-finding-text">
                            {result.diagnosis.findings.map(f => f.replace(/<b>/g, '').replace(/<\/b>/g, '')).join(' · ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ======= ABOUT ======= */}
        {activeSection === 'about' && (
          <section className="page-wrapper fade-in">
            <div className="page-header">
              <div className="section-tag">— About AI Technology</div>
              <h2 className="section-title">HemaVision AI<br />Hematology</h2>
              <p className="page-desc font-display">Deep Learning Computer Vision untuk Analisis Sel Darah.</p>
            </div>

            <div className="about-grid">
              <div className="about-text">
                <p className="about-lead">
                  HemaVision mengintegrasikan model arsitektur YOLOv11 (You Only Look Once) dengan pipeline backend Python Flask untuk mendeteksi sel darah dari mikroskopi secara presisi.
                </p>
                <p>
                  Sistem dirancang untuk memproses citra apusan darah (blood smear) beresolusi 640x480 piksel, menyamai dimensi standar dataset BCCD. Deteksi dilakukan secara real-time untuk mengekstrak tiga tipe sel utama: Sel Darah Merah (RBC), Sel Darah Putih (WBC), dan Keping Darah (Trombosit / Platelet).
                </p>
                <p>
                  Melalui implementasi React, visualisasi data lab tidak lagi statis. HemaVision menyajikan data interaktif visual SVG yang dinamis guna meningkatkan pemahaman peneliti dan mahasiswa dalam menganalisis data hematologi.
                </p>
              </div>

              <div className="glass-panel">
                <div className="panel-label">
                  <Info size={14} /> SPESIFIKASI STACK BARU
                </div>
                <div className="stack-row">
                  <span className="stack-label">AI Engine</span>
                  <span className="stack-val">YOLOv11 Object Detection</span>
                </div>
                <div className="stack-row">
                  <span className="stack-label">Backend API</span>
                  <span className="stack-val">Flask (Python 3.13)</span>
                </div>
                <div className="stack-row">
                  <span className="stack-label">Framework UI</span>
                  <span className="stack-val">React 19 + Vite 8</span>
                </div>
                <div className="stack-row">
                  <span className="stack-label">Interaktivitas</span>
                  <span className="stack-val">SVG Dynamic Components</span>
                </div>
                <div className="stack-row">
                  <span className="stack-label">Visual Library</span>
                  <span className="stack-val">Lucide Vector Vector Graphics</span>
                </div>
              </div>
            </div>

            <div className="disclaimer-box">
              <h4>Pernyataan Penggunaan & Batasan</h4>
              <p>
                Aplikasi ini dikembangkan semata-mata untuk kebutuhan edukasi, riset non-klinis, dan demonstrasi kemampuan sistem computer vision YOLO. Angka rentang normal yang ditunjukkan dalam aplikasi ini mengacu pada densitas estimasi citra mikroskopik frame per frame, bukan merupakan rentang rujukan klinis laboratorium medis resmi. Aplikasi ini bukan alat diagnosa klinis tersertifikasi BPOM/Kemenkes dan tidak boleh digunakan sebagai basis keputusan klinis pasien nyata.
              </p>
            </div>
          </section>
        )}

        {/* ======= HOW IT WORKS / WORKFLOW ======= */}
        {activeSection === 'how' && (
          <section className="page-wrapper fade-in">
            <div className="page-header">
              <div className="section-tag">— Workflow</div>
              <h2 className="section-title">Cara Kerja Sistem</h2>
              <p className="page-desc">Prosedur pengolahan data apusan darah dari input citra hingga hasil laporan diagnosa.</p>
            </div>

            <div className="steps-grid">
              <div className="glass-panel step-card">
                <div className="step-num">01</div>
                <div className="step-divider"></div>
                <h3>Unggah Gambar</h3>
                <p>Pengguna memilih file citra apusan darah melalui antarmuka web, baik secara tunggal maupun secara batch.</p>
              </div>

              <div className="glass-panel step-card">
                <div className="step-num">02</div>
                <div className="step-divider"></div>
                <h3>Prediksi Model YOLO</h3>
                <p>Backend Flask mengirimkan citra ke model YOLOv11 untuk mendeteksi lokasi sel dan melabelinya.</p>
              </div>

              <div className="glass-panel step-card">
                <div className="step-num">03</div>
                <div className="step-divider"></div>
                <h3>Kalkulasi Referensi</h3>
                <p>Sistem membandingkan jumlah sel terdeteksi terhadap rentang normal per frame sampel.</p>
              </div>

              <div className="glass-panel step-card">
                <div className="step-num">04</div>
                <div className="step-divider"></div>
                <h3>Visual & PDF</h3>
                <p>Hasil divisualisasikan dalam bentuk grafik interaktif SVG dan dapat diunduh dalam file laporan PDF resmi.</p>
              </div>
            </div>

            <div className="cta-banner">
              <div className="cta-banner-text">Mulai Deteksi Sel Darah dengan AI Sekarang</div>
              <button className="btn btn-primary" onClick={() => setActiveSection('detect')}>
                Mulai Uji Uji
              </button>
            </div>
          </section>
        )}
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <p>© 2026 HemaVision — AI-Powered Hematology Analysis. Hak Cipta Dilindungi.</p>
          <div className="footer-links">
            <a onClick={() => setActiveSection('home')}>Home</a>
            <a onClick={() => setActiveSection('detect')}>Detect</a>
            <a onClick={() => setActiveSection('batch')}>Batch</a>
            <a onClick={() => setActiveSection('about')}>About</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
