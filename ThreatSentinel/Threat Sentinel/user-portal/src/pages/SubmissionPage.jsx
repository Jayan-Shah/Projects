// /user-portal/src/pages/SubmissionPage.jsx

import React, { useState } from "react";
import { useAuth } from "../AuthContext";

const SubmissionPage = () => {
  const [submissionType, setSubmissionType] = useState("file"); // 'file' or 'url'
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { callApiWithFile, callApi } = useAuth();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setIsError(false);

    try {
      if (submissionType === "file") {
        if (!file) throw new Error("Please select a file to upload.");
        const formData = new FormData();
        formData.append("description", description);
        formData.append("file", file);
        await callApiWithFile("/incidents/file", "POST", formData);
      } else {
        if (!url) throw new Error("Please enter a URL to submit.");
        const jsonData = {
          submitted_by: "placeholder", // Required by schema, overridden by backend
          incident_type: "URL_SUBMISSION",
          submitted_url: url,
          submitted_text: null, // Must be present, can be null
          description: description,
        };

        await callApi("/incidents/url", {
          method: "POST",
          body: JSON.stringify(jsonData),
        });
      }

      setMessage(
        "Incident submitted successfully! Thank you for your vigilance."
      );
      // Reset form on success
      setDescription("");
      setFile(null);
      setUrl("");
      if (document.getElementById("file-input")) {
        document.getElementById("file-input").value = null;
      }
    } catch (err) {
      setMessage(`Submission failed: ${err.message}`);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Submit a New Cyber Incident</h2>
      <p>
        Upload a suspicious file or submit a URL for analysis. All submissions
        are logged and tracked.
      </p>

      <div className="form-group submission-type-selector">
        <label>
          <input
            type="radio"
            value="file"
            checked={submissionType === "file"}
            onChange={() => setSubmissionType("file")}
          />
          <span>Submit a File</span>
        </label>
        <label>
          <input
            type="radio"
            value="url"
            checked={submissionType === "url"}
            onChange={() => setSubmissionType("url")}
          />
          <span>Submit a URL</span>
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="description">Description of Incident</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., 'Received this suspicious PDF in an email from an unknown sender...'"
            rows="4"
            required
          />
        </div>

        {submissionType === "file" ? (
          <div className="form-group">
            <label htmlFor="file-input">
              Forensic Evidence File (Image, Document, Audio, Video, etc.)
            </label>
            <input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              required
            />
          </div>
        ) : (
          <div className="form-group">
            <label htmlFor="url-input">Suspicious URL</label>
            <input
              id="url-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://suspicious-site.com/login"
              required
            />
          </div>
        )}

        <button type="submit" className="form-button" disabled={isLoading}>
          {isLoading ? "Submitting..." : "Submit for Analysis"}
        </button>
      </form>

      {message && (
        <p
          className={`message ${isError ? "error-message" : "success-message"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default SubmissionPage;
