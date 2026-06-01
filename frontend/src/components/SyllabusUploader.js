'use client';

import { useState } from 'react';
import { loadSampleSyllabus } from '@/lib/api';

export default function SyllabusUploader({ onSubmit }) {
  const [activeTab, setActiveTab] = useState('modernize'); // modernize or generate
  
  // Tab 1 (Modernize) State
  const [jsonFile, setJsonFile] = useState(null);
  const [jsonContent, setJsonContent] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [modernizeQuery, setModernizeQuery] = useState('');
  
  // Tab 2 (Generate) State
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [totalHours, setTotalHours] = useState(60);
  const [generateQuery, setGenerateQuery] = useState('');

  const [loadingSample, setLoadingSample] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/json') {
      processFile(file);
    } else {
      alert('Please upload a valid JSON syllabus file.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    setJsonFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        setJsonContent(parsed);
      } catch (err) {
        alert('Failed to parse JSON file. Ensure it is a valid JSON document.');
        setJsonFile(null);
        setJsonContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = async () => {
    setLoadingSample(true);
    try {
      const sample = await loadSampleSyllabus();
      setJsonContent(sample);
      setJsonFile({ name: 'sample_syllabus.json' });
    } catch (err) {
      alert('Failed to load sample syllabus: ' + err.message);
    } finally {
      setLoadingSample(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeTab === 'modernize') {
      if (!jsonContent) return;
      onSubmit({
        mode: 'modernize',
        syllabus: jsonContent,
        query: modernizeQuery
      });
    } else {
      if (!topic.trim()) return;
      onSubmit({
        mode: 'generate',
        topic,
        target_audience: targetAudience,
        level,
        total_hours: parseInt(totalHours) || 60,
        query: generateQuery
      });
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px' }}>
      <div className="tab-container">
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'modernize' ? 'active' : ''}`}
          onClick={() => setActiveTab('modernize')}
        >
          🔄 Modernize Existing Syllabus
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          🆕 Generate Course From Scratch
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'modernize' && (
          <div className="animate-fade-in">
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Upload an existing syllabus JSON. The agent team will analyze the outline, research industry shifts, and design a modern program.
            </p>

            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragOver ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-glass)',
                borderRadius: 'var(--radius-lg)',
                padding: '40px 24px',
                textAlign: 'center',
                background: isDragOver ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                marginBottom: '24px',
                boxShadow: isDragOver ? 'var(--shadow-glow)' : 'none'
              }}
              onClick={() => document.getElementById('syllabus-file-input').click()}
            >
              <input 
                id="syllabus-file-input"
                type="file" 
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <span style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>📁</span>
              {jsonFile ? (
                <div>
                  <h4 style={{ color: 'var(--accent-success)', marginBottom: '8px' }}>
                    Successfully Loaded: {jsonFile.name}
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Click or drag a new file to replace</p>
                </div>
              ) : (
                <div>
                  <h4 style={{ marginBottom: '8px', fontSize: '16px' }}>Drag & Drop syllabus JSON here</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>or click to browse local files</p>
                </div>
              )}
            </div>

            {jsonContent && (
              <div style={{ marginBottom: '24px' }}>
                <span className="form-label">Syllabus Outline Preview:</span>
                <pre style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-glass)',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  textAlign: 'left'
                }}>
                  {JSON.stringify(jsonContent, null, 2)}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleLoadSample}
                disabled={loadingSample}
                style={{ flex: 1 }}
              >
                {loadingSample ? 'Loading...' : '💡 Load Outdated Sample Syllabus'}
              </button>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="modernize-query">
                Additional Instructions / Focus Areas (Optional)
              </label>
              <textarea 
                id="modernize-query"
                className="form-textarea"
                placeholder="e.g. Focus heavily on containerization, next.js, and cloud deployment. Skip PHP."
                value={modernizeQuery}
                onChange={(e) => setModernizeQuery(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '14px 24px', fontSize: '16px' }}
              disabled={!jsonContent}
            >
              🚀 Modernize & Generate Course
            </button>
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="animate-fade-in">
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
              Enter a topic and target parameters. The agent team will research modern skills, write detailed course modules, and construct a complete curriculum from scratch.
            </p>

            <div className="form-group">
              <label className="form-label" htmlFor="topic">Topic / Subject *</label>
              <input 
                id="topic"
                type="text" 
                className="form-input"
                placeholder="e.g. Full-stack Web Development, Machine Learning, UI/UX Design"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>

            <div className="grid-2" style={{ gap: '20px', marginBottom: '24px' }}>
              <div>
                <label className="form-label" htmlFor="audience">Target Audience</label>
                <input 
                  id="audience"
                  type="text" 
                  className="form-input"
                  placeholder="e.g. 3rd year CS undergrads, Career changers"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" htmlFor="level">Skill Level</label>
                <select 
                  id="level"
                  className="form-select"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="hours">Total Course Duration (Hours)</label>
              <input 
                id="hours"
                type="number" 
                className="form-input"
                min="10"
                max="300"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="generate-query">
                Additional Instructions / Focus Areas (Optional)
              </label>
              <textarea 
                id="generate-query"
                className="form-textarea"
                placeholder="e.g. Include interactive coding workshops, focus on TypeScript, add a capstone portfolio project."
                value={generateQuery}
                onChange={(e) => setGenerateQuery(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '14px 24px', fontSize: '16px' }}
              disabled={!topic.trim()}
            >
              🚀 Generate Curriculum from Scratch
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
