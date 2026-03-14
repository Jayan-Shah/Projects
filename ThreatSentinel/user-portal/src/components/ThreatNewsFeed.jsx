// /user-portal/src/components/ThreatNewsFeed.jsx (FINAL Guardian API VERSION)

import React, { useState, useEffect } from "react";
import NewsArticle from "./NewsArticle";

const API_KEY = import.meta.env.VITE_GUARDIAN_API_KEY;

const ThreatNewsFeed = ({ showTitle = true }) => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      // This is a highly targeted query for The Guardian's technology section
      const section = "technology";
      const keywords =
        "cybersecurity OR malware OR phishing OR hacking OR databreach OR vulnerability";
      // We request specific fields like the thumbnail to be included in the response
      const apiUrl = `https://content.guardianapis.com/search?section=${section}&q=${encodeURIComponent(
        keywords
      )}&show-fields=thumbnail,headline&page-size=15&api-key=${API_KEY}`;

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(
            "Failed to fetch from The Guardian API. Please check your API Key."
          );
        }
        const data = await response.json();

        // The articles are in data.response.results
        const fetchedArticles = data.response?.results || [];
        setArticles(fetchedArticles);
      } catch (err) {
        setError(err.message);
        console.error("News Feed Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (API_KEY) {
      fetchNews();
    } else {
      setError("The Guardian API Key is not configured in the .env file.");
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="threat-news-feed">
      {showTitle && <h3>Live Threat Intelligence</h3>}
      {isLoading && <p>Loading latest bulletins...</p>}
      {error && <p className="error-message">{error}</p>}
      <div className="articles-container">
        {articles.map((article) => (
          <NewsArticle key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
};

export default ThreatNewsFeed;
