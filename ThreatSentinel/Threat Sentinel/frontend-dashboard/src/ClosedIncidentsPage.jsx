import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { Link } from "react-router-dom";
import Modal from "react-modal";

Modal.setAppElement("#root");

const ClosedIncidentsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, logout, callApi } = useAuth();

  // State and helpers for the interactive modal
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isRawDataVisible, setIsRawDataVisible] = useState(false);

  const toggleRawDataVisibility = () => {
    setIsRawDataVisible(!isRawDataVisible);
  };

  const handlePreviewEvidence = async (objectName) => {
    try {
      const blob = await callApi(`/incidents/view/${objectName}`, {}, true);
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, "_blank");
    } catch (error) {
      console.error("Failed to fetch evidence file for preview:", error);
      setError("Could not retrieve evidence file.");
    }
  };

  const handleDownloadEvidence = async (objectName) => {
    try {
      const blob = await callApi(`/incidents/view/${objectName}`, {}, true);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = objectName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download evidence file:", error);
      setError("Could not retrieve evidence file for download.");
    }
  };

  const fetchClosedIncidents = useCallback(async () => {
    try {
      const data = await callApi("/incidents/closed");
      setIncidents(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [callApi]);

  useEffect(() => {
    fetchClosedIncidents();
  }, [fetchClosedIncidents]);

  return (
    <>
      <header className="App-header">
        <h1>Threat Sentinel - Closed Incident Archive</h1>
        <div className="header-controls">
          <span className="user-info">
            User: <strong>{user?.sub}</strong> ({user?.role})
          </span>
          <Link to="/dashboard" className="nav-link">
            Return to Live Dashboard
          </Link>
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      <main className="dashboard">
        {isLoading && <p>Loading archive...</p>}
        {error && <p className="error-message">Error: {error}</p>}
        {!isLoading && !error && (
          <table className="incident-table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Submitted By</th>
                <th>Status</th>
                <th>Evidence</th>
                <th>Description</th>
                <th>Original Verdict</th>
              </tr>
            </thead>
            <tbody>
              {incidents.length > 0 ? (
                incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <td>{incident.id.substring(0, 8)}...</td>
                    <td>{incident.submitted_by}</td>
                    <td>{incident.status}</td>
                    <td>{incident.submitted_url || incident.submitted_text}</td>
                    <td>{incident.description}</td>
                    <td>{incident.analysis_result?.final_verdict || "N/A"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">No closed incidents found in the archive.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </main>

      <Modal
        isOpen={selectedIncident !== null}
        onRequestClose={() => {
          setSelectedIncident(null);
          setIsRawDataVisible(false);
        }}
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <h2>
          Archived Incident Details: {selectedIncident?.id.substring(0, 8)}...
        </h2>

        {/* This new section displays the resolution note */}
        {selectedIncident?.resolution && (
          <div className="resolution-note">
            <strong>Resolution Note:</strong> {selectedIncident.resolution}
          </div>
        )}

        {/* Key Findings Section */}
        {selectedIncident?.analysis_result ? (
          <div className="analysis-results-section">
            <div className="results-summary-grid">
              <div className="summary-item">
                <span className="summary-label">Original Severity</span>
                <span
                  className={`summary-value severity-${selectedIncident.analysis_result.severity.toLowerCase()}`}
                >
                  {selectedIncident.analysis_result.severity}
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Original Risk Score</span>
                <span className="summary-value">
                  {selectedIncident.analysis_result.risk_score} / 100
                </span>
              </div>
            </div>
            <p className="summary-text">
              {selectedIncident.analysis_result.summary}
            </p>
            <h4>Original Analysis Breakdown</h4>
            <table className="analysis-details-table">
              <thead>
                <tr>
                  <th>Analyzer</th>
                  <th>Finding</th>
                  <th>Risk Contribution</th>
                </tr>
              </thead>
              <tbody>
                {selectedIncident.analysis_result.details.map(
                  (detail, index) => (
                    <tr key={index}>
                      <td>{detail.analyzer_name}</td>
                      <td>{detail.result}</td>
                      <td>+{detail.score_contribution}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-analysis-placeholder">
            <p>
              This incident was closed manually before analysis was complete.
            </p>
          </div>
        )}

        {/* Evidence Actions Section */}
        {selectedIncident && !selectedIncident.submitted_url && (
          <div className="file-actions">
            <h4>Evidence File Actions</h4>
            <p>Filename: {selectedIncident.submitted_text}</p>
            <div className="file-actions-buttons">
              <button
                className="action-button preview"
                onClick={() =>
                  handlePreviewEvidence(selectedIncident.submitted_text)
                }
              >
                Preview in New Tab
              </button>
              <button
                className="action-button download"
                onClick={() =>
                  handleDownloadEvidence(selectedIncident.submitted_text)
                }
              >
                Download for Forensic Analysis
              </button>
            </div>
          </div>
        )}

        {/* Raw Data (Collapsible) Section */}
        <div className="raw-data-accordion">
          <button
            onClick={toggleRawDataVisibility}
            className="accordion-toggle"
          >
            <h4>Full Incident Data</h4>
            <span className={`arrow ${isRawDataVisible ? "down" : "right"}`}>
              &#9654;
            </span>
          </button>
          {isRawDataVisible && (
            <pre className="accordion-content">
              {JSON.stringify(selectedIncident, null, 2)}
            </pre>
          )}
        </div>

        {/* Simplified Final Actions for the Archive */}
        <div className="modal-actions">
          <button
            onClick={() => {
              setSelectedIncident(null);
              setIsRawDataVisible(false);
            }}
          >
            Close Viewer
          </button>
        </div>
      </Modal>
    </>
  );
};

export default ClosedIncidentsPage;
