// /user-portal/src/components/NewsArticle.jsx (FINAL Guardian API VERSION)

import React from "react";

const NewsArticle = ({ article }) => {
  // Format the date for better readability
  const formattedDate = new Date(article.webPublicationDate).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    // The entire article is a clickable link that opens the original source in a new tab
    <a
      href={article.webUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="news-article-link"
    >
      <div className="news-article-card">
        <div className="article-image-container">
          {/* The Guardian provides a 'thumbnail' in the 'fields' object */}
          <img src={article.fields.thumbnail} alt={article.webTitle} />
        </div>
        <div className="article-content">
          <div className="article-header">
            {/* The source is always The Guardian, so we can use the section name */}
            <span className="article-source">{article.sectionName}</span>
            <span className="article-date">{formattedDate}</span>
          </div>
          <h4 className="article-title">{article.webTitle}</h4>
        </div>
      </div>
    </a>
  );
};

export default NewsArticle;
