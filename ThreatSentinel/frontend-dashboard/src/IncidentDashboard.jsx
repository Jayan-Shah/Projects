import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { Link } from "react-router-dom";
import Modal from "react-modal";

Modal.setAppElement("#root");

const IncidentDashboard = () => {
  const [liveIncidents, setLiveIncidents] = useState([]); // For the live table
  const [allIncidents, setAllIncidents] = useState([]); // For the stats bar
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const { user, logout, callApi } = useAuth();

  // New state to manage the visibility of the raw data accordion
  const [isRawDataVisible, setIsRawDataVisible] = useState(false);

  const fetchIncidents = useCallback(async () => {
    try {
      const [openData, allData] = await Promise.all([
        callApi("/incidents/open"), // For the live feed table
        callApi("/incidents/"), // For calculating accurate stats
      ]);
      setLiveIncidents(openData);
      setAllIncidents(allData);
      setError(null);
    } catch (e) {
      setError(e.message);
      console.error("Failed to fetch incidents:", e);
    } finally {
      setIsLoading(false);
    }
  }, [callApi]);

  useEffect(() => {
    fetchIncidents();
    const intervalId = setInterval(fetchIncidents, 5000);
    return () => clearInterval(intervalId);
  }, [fetchIncidents]);

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

  const handleCloseIncident = async (incidentId) => {
    try {
      await callApi(`/incidents/${incidentId}/close`, { method: "POST" });
      setSelectedIncident(null);
      setIsRawDataVisible(false); // Reset accordion on close
      await fetchIncidents(); // This will refresh both stats and the live feed
    } catch (err) {
      setError(`Failed to close incident: ${err.message}`);
    }
  };

  const toggleRawDataVisibility = () => {
    setIsRawDataVisible(!isRawDataVisible);
  };

const pendingCount = liveIncidents.length;
useEffect(() => {
  document.title =
    pendingCount > 0 ? `(${pendingCount}) Threat Sentinel` : "Threat Sentinel";
}, [pendingCount]);

const totalReports = allIncidents.length;

// --- THIS IS THE CORRECTED LOGIC ---
const highRiskAlerts = allIncidents.filter(
  (inc) =>
    // Condition 1: The verdict must be high risk
    (inc.analysis_result?.severity === "HIGH" ||
      inc.analysis_result?.severity === "CRITICAL") &&
    // Condition 2: The incident must NOT have a resolution note
    !inc.resolution
).length;



  if (isLoading)
    return <div className="full-page-loader">Loading Incidents...</div>;
  if (error) return <div className="full-page-error">Error: {error}</div>;

  return (
    <>
      <header className="App-header">
        <h1>Threat Sentinel - CERT Command Dashboard</h1>
        <div className="header-controls">
          {user && (
            <span className="user-info">
              User: <strong>{user.sub}</strong> ({user.role})
            </span>
          )}
          {user?.role === "ADMIN" && (
            <Link to="/admin" className="nav-link">
              Admin Panel
            </Link>
          )}
          <button onClick={logout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      <main className="dashboard">
        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value">{totalReports}</span>
            <span className="stat-label">Total Reports</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{pendingCount}</span>
            <span className="stat-label">Pending Review</span>
          </div>
          <div className="stat-item high-risk">
            <span className="stat-value">{highRiskAlerts}</span>
            <span className="stat-label">High-Risk Alerts</span>
          </div>
        </div>
        <div
          className="dashboard-actions"
          style={{ textAlign: "center", marginBottom: "2rem" }}
        >
          <Link to="/closed-incidents" className="nav-link">
            View Closed Incidents Archive
          </Link>
        </div>
        <h2>Live Incident Feed</h2>
        <table className="incident-table">
          <thead>
            <tr>
              <th>Incident ID</th>
              <th>Submitted By</th>
              <th>Status</th>
              <th>Evidence</th>
              <th>Description</th>
              <th>Analysis Verdict</th>
            </tr>
          </thead>
          <tbody>
            {liveIncidents.length > 0 ? (
              liveIncidents.map((incident) => (
                <tr
                  key={incident.id}
                  onClick={() => setSelectedIncident(incident)}
                  className={
                    incident.analysis_result?.final_verdict === "malicious"
                      ? "verdict-malicious"
                      : incident.analysis_result?.final_verdict === "suspicious"
                      ? "verdict-suspicious"
                      : ""
                  }
                >
                  <td>{incident.id.substring(0, 8)}...</td>
                  <td>{incident.submitted_by}</td>
                  <td>{incident.status}</td>
                  <td>{incident.submitted_url || incident.submitted_text}</td>
                  <td>{incident.description}</td>
                  <td>
                    {incident.analysis_result?.final_verdict || "PENDING"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6">The live incident queue is clear.</td>
              </tr>
            )}
          </tbody>
        </table>

        <Modal
          isOpen={selectedIncident !== null}
          onRequestClose={() => {
            setSelectedIncident(null);
            setIsRawDataVisible(false); // Reset accordion when modal closes
          }}
          className="modal-content"
          overlayClassName="modal-overlay"
        >
          <h2>Incident Details: {selectedIncident?.id.substring(0, 8)}...</h2>

          {/* SECTION 1: KEY FINDINGS (Always visible) */}
          {selectedIncident?.analysis_result ? (
            <div className="analysis-results-section">
              <div className="results-summary-grid">
                <div className="summary-item">
                  <span className="summary-label">Severity</span>
                  <span
                    className={`summary-value severity-${selectedIncident.analysis_result.severity.toLowerCase()}`}
                  >
                    {selectedIncident.analysis_result.severity}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Risk Score</span>
                  <span className="summary-value">
                    {selectedIncident.analysis_result.risk_score} / 100
                  </span>
                </div>
              </div>
              <p className="summary-text">
                {selectedIncident.analysis_result.summary}
              </p>

              <h4>Analysis Breakdown</h4>
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
              <p>This incident is still pending analysis.</p>
            </div>
          )}

          {/* SECTION 2: ANALYST ACTIONS (Always visible) */}
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

          {/* SECTION 3: RAW DATA (Collapsible) */}
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

          {/* SECTION 4: FINAL ACTIONS (Always visible) */}
          <div className="modal-actions">
            <button className="action-button escalate">Escalate</button>
            <button
              className="action-button close-incident"
              onClick={() => handleCloseIncident(selectedIncident.id)}
            >
              Close Incident
            </button>
            <button
              onClick={() => {
                setSelectedIncident(null);
                setIsRawDataVisible(false);
              }}
            >
              Cancel
            </button>
          </div>
        </Modal>
      </main>
    </>
  );
};

export default IncidentDashboard;
