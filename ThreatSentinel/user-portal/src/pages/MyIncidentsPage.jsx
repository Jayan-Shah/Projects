// /user-portal/src/pages/MyIncidentsPage.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthContext";

const MyIncidentsPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { callApi } = useAuth();

  const fetchIncidents = useCallback(async () => {
    try {
      const data = await callApi("/incidents/");
      setIncidents(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [callApi]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return (
    <div className="table-container">
      <h2>My Submitted Incidents</h2>
      {isLoading && <p>Loading your incidents...</p>}
      {error && <p className="error-message">Error fetching data: {error}</p>}
      {!isLoading && !error && (
        <table className="user-incident-table">
          <thead>
            <tr>
              <th>Date Submitted</th>
              <th>Description</th>
              <th>Status</th>
              <th>Analysis Verdict</th>
            </tr>
          </thead>
          <tbody>
            {incidents.length > 0 ? (
              incidents.map((incident) => (
                <tr key={incident.id}>
                  <td>{new Date(incident.created_at).toLocaleString()}</td>
                  <td>{incident.description}</td>
                  <td>{incident.status}</td>
                  <td>{incident.analysis_result?.final_verdict || "N/A"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4">You have not submitted any incidents yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MyIncidentsPage;
