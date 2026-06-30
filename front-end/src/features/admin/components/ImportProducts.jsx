import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from "@shared/context/ToastContext";
import { BASE_URL } from '@shared/utils/api';
import FileDropzone from './FileDropzone';
import PreviewTable from './PreviewTable';
import ImportResult from './ImportResult';
import '../styles/import.css';

/**
 * ImportProducts Modal Component
 * 3-step wizard: Upload → Preview → Result
 */
function ImportProducts({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Result
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { showToast } = useToast();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
  };

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem('fyd_token');
      const response = await fetch(`${BASE_URL}/api/import/template`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading template:', error);
      showToast('Failed to download template', "error");
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('fyd_token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BASE_URL}/api/import/products/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview import');
      }

      setPreview(data);
      setStep(2);
    } catch (error) {
      console.error('Error previewing import:', error);
      showToast(error.message || 'Failed to preview import', "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('fyd_token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BASE_URL}/api/import/products/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute import');
      }

      setResult(data);
      setStep(3);

      if (data.successCount > 0 && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error executing import:', error);
      showToast(error.message || 'Failed to execute import', "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setResult(null);
    onClose();
  };

  const handleImportMore = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  if (!open) return null;

  const modalContent = (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Products</h2>
          <button className="close-btn" onClick={handleClose}>&times;</button>
        </div>

        <div className="modal-body">
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Upload</div>
            </div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Preview</div>
            </div>
            <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Result</div>
            </div>
          </div>

          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="step-content">
              <div className="template-section">
                <p>Download the Excel template to get started:</p>
                <button className="btn-secondary" onClick={handleDownloadTemplate}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Template
                </button>
              </div>

              <FileDropzone onFileSelect={handleFileSelect} selectedFile={file} />

              {file && (
                <div className="file-info">
                  <p><strong>Selected file:</strong> {file.name}</p>
                  <p><strong>Size:</strong> {(file.size / 1024).toFixed(2)} KB</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && preview && (
            <div className="step-content">
              <div className="preview-summary">
                <div className="summary-item">
                  <span className="label">Total Rows:</span>
                  <span className="value">{preview.totalRows}</span>
                </div>
                <div className="summary-item valid">
                  <span className="label">Valid:</span>
                  <span className="value">{preview.validRows}</span>
                </div>
                <div className="summary-item invalid">
                  <span className="label">Invalid:</span>
                  <span className="value">{preview.invalidRows}</span>
                </div>
              </div>

              <PreviewTable
                rows={preview.rows}
                validationResults={preview.validationResults}
              />
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && result && (
            <div className="step-content">
              <ImportResult result={result} onImportMore={handleImportMore} onClose={handleClose} />
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 1 && (
            <>
              <button className="btn-secondary" onClick={handleClose}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handlePreview}
                disabled={!file || loading}
              >
                {loading ? 'Processing...' : 'Next: Preview'}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button
                className="btn-primary"
                onClick={handleExecute}
                disabled={loading || preview.validRows === 0}
              >
                {loading ? 'Importing...' : `Import ${preview.validRows} Products`}
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <button className="btn-secondary" onClick={handleImportMore}>Import More</button>
              <button className="btn-primary" onClick={handleClose}>Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Use portal to render modal at document.body level
  return createPortal(modalContent, document.body);
}

export default ImportProducts;
