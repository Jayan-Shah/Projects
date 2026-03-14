import React from "react";
import ThreatNewsFeed from "../components/ThreatNewsFeed";

const LiveNewsPage = () => {
  return (
    // We reuse the 'table-container' style for the white card background
    <div className="table-container">
      <h2>Live Threat Intelligence Feed</h2>
      <p>
        Stay informed with the latest cybersecurity bulletins and threat
        advisories from around the world.
      </p>
      <ThreatNewsFeed />
    </div>
  );
};

export default LiveNewsPage;
