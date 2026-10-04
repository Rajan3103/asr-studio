import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Upload,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Zap,
  Layers,
  FileText,
  Clock,
  Globe,
  Settings,
  Activity,
  Code,
  Sparkles,
  ChevronRight,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const SUPPORTED_LANGUAGES = {
  auto: 'Auto Detect Language',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  bn: 'Bengali',
  tr: 'Turkish',
};

const THEMES = [
  { id: 'emerald', name: '🌿 Emerald Matrix / Dark Velvet' },
  { id: 'obsidian', name: '🌌 Cyber Obsidian' },
  { id: 'nebula', name: '🔮 Deep Nebula / Aurora' },
  { id: 'sunset', name: '🌅 Tokyo Sunset / Horizon' },
  { id: 'frost', name: '❄️ Nordic Frost / Minimal' },
];

export default function App() {
  const [activeTheme, setActiveTheme] = useState('emerald');
  const [activeTab, setActiveTab] = useState('studio');
  
  // Model Settings
  const [modelSize, setModelSize] = useState('base');
  const [task, setTask] = useState('transcribe');
  const [language, setLanguage] = useState('auto');
  const [beamSize, setBeamSize] = useState(5);
  const [vadFilter, setVadFilter] = useState(true);
  const [wordTimestamps, setWordTimestamps] = useState(true);

  // Audio Studio State
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'record'
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioMetrics, setAudioMetrics] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Synthetic Benchmark State
  const [synthDuration, setSynthDuration] = useState(3.0);
  const [synthLoading, setSynthLoading] = useState(false);
  const [synthResult, setSynthResult] = useState(null);
  const [synthAudioUrl, setSynthAudioUrl] = useState(null);

  // Batch State
  const [batchFiles, setBatchFiles] = useState([]);
  const [batchResults, setBatchResults] = useState([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Apply Theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  // Audio File Selection Handler
  const handleFileChange = async (file) => {
    if (!file) return;
    setSelectedFile(file);
    setErrorMsg(null);
    setResult(null);

    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    // Fetch Audio Metrics from FastAPI
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API_BASE}/audio-info`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const info = await res.json();
        setAudioMetrics(info);
      }
    } catch (e) {
      console.warn('Could not fetch audio metrics:', e);
    }
  };

  // Live Microphone Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Web Audio API Visualizer Setup
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      drawVisualizer();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([audioBlob], 'live_recording.wav', { type: 'audio/wav' });
        handleFileChange(file);
        // Stop audio visualizer
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioCtx.state !== 'closed') audioCtx.close();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setErrorMsg(`Microphone access error: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = activeTheme === 'emerald' ? '#34d399' : '#38bdf8';
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    render();
  };

  // Run Transcription
  const handleTranscribe = async () => {
    if (!selectedFile) {
      setErrorMsg('Please select or record an audio file first.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    const queryParams = new URLSearchParams({
      model: modelSize,
      task: task,
      beam_size: beamSize.toString(),
      vad_filter: vadFilter.toString(),
      word_timestamps: wordTimestamps.toString(),
    });

    if (language && language !== 'auto') {
      queryParams.append('language', language);
    }

    try {
      const res = await fetch(`${API_BASE}/transcribe?${queryParams.toString()}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Transcription failed');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setErrorMsg(`Inference Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy to Clipboard
  const handleCopy = () => {
    if (result && result.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Subtitle Export Downloader
  const downloadSubtitle = async (format) => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);

    const queryParams = new URLSearchParams({
      format: format,
      model: modelSize,
      task: task,
    });
    if (language && language !== 'auto') {
      queryParams.append('language', language);
    }

    try {
      const res = await fetch(`${API_BASE}/transcribe/export?${queryParams.toString()}`, {
        method: 'POST',
        body: formData,
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      a.download = `${baseName}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setErrorMsg(`Download failed: ${e.message}`);
    }
  };

  // Synthetic Benchmark Runner
  const handleSyntheticBenchmark = async () => {
    setSynthLoading(true);
    setSynthResult(null);
    try {
      // 1. Synthesize audio file
      const synthRes = await fetch(`${API_BASE}/synthesize-sample?duration=${synthDuration}`, {
        method: 'POST',
      });
      const audioBlob = await synthRes.blob();
      const synthFile = new File([audioBlob], 'synthetic_speech.wav', { type: 'audio/wav' });
      setSynthAudioUrl(URL.createObjectURL(audioBlob));

      // 2. Transcribe synthetic audio
      const formData = new FormData();
      formData.append('file', synthFile);

      const t0 = performance.now();
      const res = await fetch(`${API_BASE}/transcribe?model=${modelSize}&task=${task}`, {
        method: 'POST',
        body: formData,
      });
      const t1 = performance.now();
      const data = await res.json();

      const latencySec = (t1 - t0) / 1000;
      setSynthResult({
        latency: latencySec.toFixed(3),
        rtf: (synthDuration / Math.max(latencySec, 0.001)).toFixed(1),
        data: data,
      });
    } catch (e) {
      setErrorMsg(`Benchmark failed: ${e.message}`);
    } finally {
      setSynthLoading(false);
    }
  };

  // Batch Queue Runner
  const handleBatchProcess = async () => {
    if (batchFiles.length === 0) return;
    setBatchProcessing(true);
    setBatchResults([]);
    setBatchProgress(0);

    const results = [];
    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_BASE}/transcribe?model=${modelSize}&task=${task}`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        results.push({
          name: file.name,
          status: 'success',
          language: data.language ? data.language.toUpperCase() : 'EN',
          duration: `${data.duration_seconds || 0}s`,
          text: data.text || '[No speech detected]',
        });
      } catch (err) {
        results.push({
          name: file.name,
          status: 'error',
          language: '-',
          duration: '-',
          text: err.message,
        });
      }

      setBatchResults([...results]);
      setBatchProgress(Math.round(((i + 1) / batchFiles.length) * 100));
    }
    setBatchProcessing(false);
  };

  return (
    <div className="app-container">
      {/* HERO BANNER */}
      <div className="hero-banner">
        <div className="hero-top-row">
          <div className="hero-tag">
            <Sparkles size={14} />
            <span>Faster-Whisper Engine • CTranslate2 • Silero VAD</span>
          </div>

          <div className="theme-selector">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Theme:</span>
            <select
              className="theme-select"
              value={activeTheme}
              onChange={(e) => setActiveTheme(e.target.value)}
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h1 className="hero-title">🎙️ ASR Studio</h1>
        <p className="hero-subtitle">
          Next-generation automatic speech recognition, real-time transcription, multi-lingual translation, voice activity detection, and caption generator.
        </p>

        <div className="pills-container">
          <div className="hero-pill"><Globe size={13} /> 90+ Languages Supported</div>
          <div className="hero-pill"><Layers size={13} /> Multi-Engine Fallback</div>
          <div className="hero-pill"><Zap size={13} /> 4x-16x Real-Time Speed</div>
          <div className="hero-pill"><FileText size={13} /> Subtitles (.SRT, .VTT, .JSON, .TXT, .CSV)</div>
          <div className="hero-pill" style={{ color: 'var(--accent-glow)' }}>👨‍💻 Developed by Karthig Rajan S</div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="nav-tabs">
        <button
          className={`tab-button ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={() => setActiveTab('studio')}
        >
          <Mic size={18} /> Studio Audio Transcribe
        </button>
        <button
          className={`tab-button ${activeTab === 'benchmark' ? 'active' : ''}`}
          onClick={() => setActiveTab('benchmark')}
        >
          <Zap size={18} /> Synthetic Benchmark
        </button>
        <button
          className={`tab-button ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          <FolderOpen size={18} /> Batch Processing Queue
        </button>
        <button
          className={`tab-button ${activeTab === 'api' ? 'active' : ''}`}
          onClick={() => setActiveTab('api')}
        >
          <Code size={18} /> REST API & CLI Docs
        </button>
      </div>

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '1rem 1.4rem',
          color: '#f87171',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ==========================================
          TAB 1: STUDIO AUDIO TRANSCRIBE
      ========================================== */}
      {activeTab === 'studio' && (
        <div className="grid-studio">
          {/* SIDEBAR CONFIGURATION */}
          <div className="config-panel">
            <h3 className="config-title">
              <Settings size={18} /> Model Configuration
            </h3>

            <div className="form-group">
              <label className="form-label">Whisper Model Tier</label>
              <select
                className="form-select"
                value={modelSize}
                onChange={(e) => setModelSize(e.target.value)}
              >
                <option value="tiny">tiny (~39M - Ultra Fast)</option>
                <option value="base">base (~74M - Recommended Default)</option>
                <option value="small">small (~244M - High Accuracy)</option>
                <option value="medium">medium (~769M - Complex Audio)</option>
                <option value="large-v3">large-v3 (~1550M - Max Precision)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Processing Task Mode</label>
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-btn ${task === 'transcribe' ? 'active' : ''}`}
                  onClick={() => setTask('transcribe')}
                >
                  🎙️ Transcribe
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${task === 'translate' ? 'active' : ''}`}
                  onClick={() => setTask('translate')}
                >
                  🌐 Translate
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Source Language</label>
              <select
                className="form-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Beam Search Size: {beamSize}</label>
              <input
                type="range"
                min="1"
                max="10"
                value={beamSize}
                onChange={(e) => setBeamSize(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
              />
            </div>

            <div style={{ marginTop: '1.2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={vadFilter}
                  onChange={(e) => setVadFilter(e.target.checked)}
                />
                <span>Enable Silero VAD Filtering</span>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={wordTimestamps}
                  onChange={(e) => setWordTimestamps(e.target.checked)}
                />
                <span>Word-level Timestamps</span>
              </label>
            </div>
          </div>

          {/* STUDIO WORKSPACE */}
          <div className="studio-workspace">
            {/* Input Selection Mode Card */}
            <div className="glass-card">
              <div className="card-header-row">
                <h3 className="card-title">
                  <Activity size={20} /> Select Audio Source
                </h3>

                <div className="toggle-group" style={{ width: '280px' }}>
                  <button
                    type="button"
                    className={`toggle-btn ${inputMode === 'upload' ? 'active' : ''}`}
                    onClick={() => setInputMode('upload')}
                  >
                    📁 Upload File
                  </button>
                  <button
                    type="button"
                    className={`toggle-btn ${inputMode === 'record' ? 'active' : ''}`}
                    onClick={() => setInputMode('record')}
                  >
                    🎙️ Live Mic
                  </button>
                </div>
              </div>

              {inputMode === 'upload' ? (
                <div
                  className="dropzone"
                  onClick={() => document.getElementById('audio-file-input').click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove('dragover'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('dragover');
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <input
                    id="audio-file-input"
                    type="file"
                    accept="audio/*"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFileChange(e.target.files[0])}
                  />
                  <div className="dropzone-icon">📥</div>
                  <div className="dropzone-text">
                    {selectedFile ? selectedFile.name : 'Click to Browse or Drag & Drop Audio File'}
                  </div>
                  <div className="dropzone-hint">
                    Supports WAV, MP3, FLAC, M4A, AAC, OGG
                  </div>
                </div>
              ) : (
                <div className="mic-studio">
                  <button
                    type="button"
                    className={`mic-circle-btn ${isRecording ? 'recording' : ''}`}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                  </button>

                  <div className="rec-timer">
                    {isRecording ? `Recording: ${recordSeconds}s` : 'Click Microphone to Start Recording'}
                  </div>

                  <canvas ref={canvasRef} className="visualizer-canvas" width={500} height={70}></canvas>
                </div>
              )}

              {/* Audio Preview Player & Metrics */}
              {audioUrl && (
                <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <audio src={audioUrl} controls style={{ width: '100%', borderRadius: '10px' }} />
                  </div>

                  {audioMetrics && (
                    <div className="metrics-grid">
                      <div className="metric-box">
                        <div className="metric-num">{audioMetrics.duration_seconds}s</div>
                        <div className="metric-label">Duration</div>
                      </div>
                      <div className="metric-box">
                        <div className="metric-num">{audioMetrics.sample_rate / 1000} kHz</div>
                        <div className="metric-label">Sample Rate</div>
                      </div>
                      <div className="metric-box">
                        <div className="metric-num">{audioMetrics.rms_energy}</div>
                        <div className="metric-label">RMS Energy</div>
                      </div>
                      <div className="metric-box">
                        <div className="metric-num">{audioMetrics.peak_amplitude}</div>
                        <div className="metric-label">Peak Amp</div>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ marginTop: '1.2rem' }}
                    onClick={handleTranscribe}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Transcribing with Whisper {modelSize.toUpperCase()}...</span>
                      </>
                    ) : (
                      <>
                        <Zap size={18} />
                        <span>Execute Speech Recognition</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* RESULTS CARD */}
            {result && (
              <div className="glass-card">
                <div className="card-header-row">
                  <h3 className="card-title">
                    <FileText size={20} /> Transcription Output
                  </h3>

                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'var(--tag-bg)',
                      border: '1px solid var(--tag-border)',
                      color: 'var(--accent-glow)',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.85rem'
                    }}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>

                <div className="results-grid">
                  <div>
                    <textarea
                      className="transcript-area"
                      value={result.text || ''}
                      readOnly
                    />
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      <span>📊 <strong>Words:</strong> {result.text ? result.text.split(/\s+/).length : 0}</span>
                      <span>⏱️ <strong>Est. Reading Time:</strong> ~{Math.max(1, Math.ceil((result.text ? result.text.split(/\s+/).length : 0) / 200))} min</span>
                    </div>
                  </div>

                  <div className="meta-infobox">
                    <div>
                      <div className="meta-item-label">Detected Language:</div>
                      <div className="meta-item-value">
                        {SUPPORTED_LANGUAGES[result.language] || result.language.toUpperCase()} ({result.language})
                      </div>
                    </div>
                    <div>
                      <div className="meta-item-label">Model Confidence:</div>
                      <div className="meta-item-value" style={{ color: '#34d399' }}>
                        {((result.language_probability || 1.0) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="meta-item-label">Engine & Latency:</div>
                      <div className="meta-item-value" style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                        {result.engine} • {result.processing_time_seconds}s
                      </div>
                    </div>
                    <div>
                      <div className="meta-item-label">Real-Time Factor:</div>
                      <div className="meta-item-value" style={{ color: 'var(--accent-glow)' }}>
                        {(result.duration_seconds / Math.max(result.processing_time_seconds, 0.001)).toFixed(1)}x Speed
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timed Segments */}
                {result.segments && result.segments.length > 0 && (
                  <div style={{ marginTop: '1.8rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.8rem', color: 'var(--text-main)' }}>
                      ⏱️ Timed Segments & Timestamps
                    </h4>
                    <div className="segments-table-wrap">
                      <table className="segments-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Time Bounds</th>
                            <th>Duration</th>
                            <th>Segment Text</th>
                            <th>Confidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.segments.map((seg, idx) => (
                            <tr key={idx}>
                              <td style={{ color: 'var(--text-muted)' }}>#{seg.id + 1}</td>
                              <td>
                                <span className="time-chip">
                                  {seg.start.toFixed(2)}s - {seg.end.toFixed(2)}s
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-muted)' }}>
                                {(seg.end - seg.start).toFixed(2)}s
                              </td>
                              <td style={{ fontWeight: '500' }}>{seg.text}</td>
                              <td>
                                <span style={{
                                  background: 'rgba(52, 211, 153, 0.12)',
                                  color: '#34d399',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: '600'
                                }}>
                                  {(seg.confidence * 100).toFixed(0)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Subtitle Downloads */}
                <div style={{ marginTop: '1.8rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.8rem', color: 'var(--text-main)' }}>
                    📥 1-Click Subtitle & Caption Exports
                  </h4>
                  <div className="download-grid">
                    <button type="button" className="btn-download" onClick={() => downloadSubtitle('txt')}>
                      <FileText size={18} />
                      <span>Plain Text (.TXT)</span>
                    </button>
                    <button type="button" className="btn-download" onClick={() => downloadSubtitle('srt')}>
                      <Clock size={18} />
                      <span>SubRip (.SRT)</span>
                    </button>
                    <button type="button" className="btn-download" onClick={() => downloadSubtitle('vtt')}>
                      <Globe size={18} />
                      <span>WebVTT (.VTT)</span>
                    </button>
                    <button type="button" className="btn-download" onClick={() => downloadSubtitle('json')}>
                      <Code size={18} />
                      <span>JSON (.JSON)</span>
                    </button>
                    <button type="button" className="btn-download" onClick={() => downloadSubtitle('csv')}>
                      <Layers size={18} />
                      <span>Spreadsheet (.CSV)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: SYNTHETIC BENCHMARK
      ========================================== */}
      {activeTab === 'benchmark' && (
        <div className="glass-card">
          <h3 className="card-title">
            <Zap size={20} /> Synthetic Speech Generator & Latency Benchmark
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.3rem', marginBottom: '1.5rem' }}>
            Benchmark the speech recognition pipeline without requiring pre-recorded voice files. Synthesizes PCM harmonic audio waves and measures execution latency.
          </p>

          <div style={{ maxWidth: '500px' }}>
            <label className="form-label">Synthetic Signal Duration: {synthDuration} seconds</label>
            <input
              type="range"
              min="1"
              max="10"
              step="0.5"
              value={synthDuration}
              onChange={(e) => setSynthDuration(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', marginBottom: '1.2rem' }}
            />

            <button
              type="button"
              className="btn-primary"
              onClick={handleSyntheticBenchmark}
              disabled={synthLoading}
            >
              {synthLoading ? 'Synthesizing & Benchmarking...' : '✨ Run Benchmark'}
            </button>
          </div>

          {synthAudioUrl && (
            <div style={{ marginTop: '1.5rem' }}>
              <audio src={synthAudioUrl} controls style={{ width: '100%', maxWidth: '500px' }} />
            </div>
          )}

          {synthResult && (
            <div style={{ marginTop: '1.5rem', background: 'var(--bg-card)', padding: '1.4rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ color: 'var(--accent-glow)', marginBottom: '0.8rem' }}>🎉 Benchmark Completed</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <div className="meta-item-label">Processing Latency:</div>
                  <div className="meta-item-value">{synthResult.latency}s</div>
                </div>
                <div>
                  <div className="meta-item-label">Real-Time Factor:</div>
                  <div className="meta-item-value">{synthResult.rtf}x Speed</div>
                </div>
                <div>
                  <div className="meta-item-label">Engine:</div>
                  <div className="meta-item-value" style={{ fontSize: '0.95rem' }}>faster-whisper ({modelSize})</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 3: BATCH QUEUE
      ========================================== */}
      {activeTab === 'batch' && (
        <div className="glass-card">
          <h3 className="card-title">
            <FolderOpen size={20} /> Batch Audio Processing Queue
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.3rem', marginBottom: '1.5rem' }}>
            Upload multiple audio files simultaneously to transcribe them sequentially through the Whisper engine.
          </p>

          <input
            type="file"
            multiple
            accept="audio/*"
            id="batch-files-input"
            style={{ display: 'none' }}
            onChange={(e) => setBatchFiles(Array.from(e.target.files))}
          />

          <button
            type="button"
            className="tab-button"
            style={{ border: '1px dashed var(--border-color)', width: '100%', justifyContent: 'center', padding: '1.5rem' }}
            onClick={() => document.getElementById('batch-files-input').click()}
          >
            <Upload size={20} />
            <span>{batchFiles.length > 0 ? `${batchFiles.length} file(s) selected` : 'Select Multiple Audio Files'}</span>
          </button>

          {batchFiles.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleBatchProcess}
                disabled={batchProcessing}
              >
                {batchProcessing ? `Processing (${batchProgress}%)...` : `🚀 Process ${batchFiles.length} Files`}
              </button>

              {batchProcessing && (
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', height: '10px', marginTop: '1rem', overflow: 'hidden' }}>
                  <div style={{ width: `${batchProgress}%`, height: '100%', background: 'var(--accent-gradient)', transition: 'width 0.3s ease' }} />
                </div>
              )}
            </div>
          )}

          {batchResults.length > 0 && (
            <div className="batch-queue-list">
              {batchResults.map((item, idx) => (
                <div key={idx} className="batch-item">
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>{item.name}</strong>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                      {item.text}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span className="time-chip">{item.duration}</span>
                    <span style={{
                      color: item.status === 'success' ? '#34d399' : '#f87171',
                      fontWeight: '600',
                      fontSize: '0.85rem'
                    }}>
                      {item.status === 'success' ? '✅ Finished' : '❌ Failed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 4: API & CLI DOCS
      ========================================== */}
      {activeTab === 'api' && (
        <div className="glass-card">
          <h3 className="card-title">
            <Code size={20} /> Developer REST API & CLI Integration
          </h3>

          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ color: 'var(--accent-glow)', marginBottom: '0.6rem' }}>1. FastAPI Microservice Endpoints</h4>
            <pre style={{ background: 'rgba(0,0,0,0.5)', padding: '1.2rem', borderRadius: '10px', color: '#cbd5e1', overflowX: 'auto', fontFamily: 'var(--font-mono)' }}>
{`# Transcribe Audio File (cURL)
curl -X POST "http://localhost:8000/transcribe?model=base&task=transcribe" \\
  -H "accept: application/json" \\
  -H "Content-Type: multipart/form-data" \\
  -F "file=@speech.wav"

# Direct Subtitle (.SRT) Export
curl -X POST "http://localhost:8000/transcribe/export?format=srt&model=base" \\
  -F "file=@speech.wav" -o captions.srt`}
            </pre>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ color: 'var(--accent-glow)', marginBottom: '0.6rem' }}>2. Command Line Interface (CLI)</h4>
            <pre style={{ background: 'rgba(0,0,0,0.5)', padding: '1.2rem', borderRadius: '10px', color: '#cbd5e1', overflowX: 'auto', fontFamily: 'var(--font-mono)' }}>
{`# Transcribe single file
python -m asr_tool.cli transcribe speech.wav --model base --format srt --output-dir ./output

# Batch transcribe entire directory
python -m asr_tool.cli transcribe ./my_audio_folder/ --model small --format all`}
            </pre>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="app-footer">
        🎙️ <strong>ASR Studio</strong> • Developed by <a href="https://github.com/Rajan3103" target="_blank" rel="noreferrer">Karthig Rajan S</a> • Powered by OpenAI Whisper Architecture & Faster-Whisper
      </footer>
    </div>
  );
}
