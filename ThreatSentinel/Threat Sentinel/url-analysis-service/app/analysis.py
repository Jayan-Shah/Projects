import os

# --- Define some basic scoring for URLs ---
RISK_POINTS = {
    "USES_IP_ADDRESS": 60,
    "EXCESSIVE_SUBDOMAINS": 40,
}

SCORE_THRESHOLDS = {
    "CRITICAL": 90,
    "HIGH": 70,
    "MEDIUM": 40,
    "LOW": 1,
}

def calculate_severity(score):
    """Translates a numerical score into a severity level."""
    for severity, threshold in SCORE_THRESHOLDS.items():
        if score >= threshold:
            return severity
    return "INFO"


def analyze_url(url: str) -> dict:
    """
    The main analysis function, now updated to produce the new, rich result format.
    """
    print(f"\n--- Analyzing URL: {url} ---")
    
    risk_score = 0
    details = []
    summary_points = []
    
    # --- Run our simple pattern checks ---
    if not url:
        details.append({
            "analyzer_name": "URL Pattern Analysis",
            "result": "No URL provided.",
            "score_contribution": 0
        })
    else:
        domain_part = ""
        try:
            domain_part = url.split('/')[2]
        except IndexError:
            pass # Handle cases with no domain

        if domain_part:
            if domain_part.replace('.', '').isdigit():
                reason = f"URL uses a direct IP address: {domain_part}"
                risk_score += RISK_POINTS["USES_IP_ADDRESS"]
                details.append({
                    "analyzer_name": "IP Address Check",
                    "result": reason,
                    "score_contribution": RISK_POINTS["USES_IP_ADDRESS"]
                })
                summary_points.append("uses direct IP")

            if domain_part.count('.') > 4:
                reason = f"URL has excessive subdomains: {domain_part}"
                risk_score += RISK_POINTS["EXCESSIVE_SUBDOMAINS"]
                details.append({
                    "analyzer_name": "Subdomain Check",
                    "result": reason,
                    "score_contribution": RISK_POINTS["EXCESSIVE_SUBDOMAINS"]
                })
                summary_points.append("excessive subdomains")
    
    if not summary_points:
         details.append({
            "analyzer_name": "URL Pattern Analysis",
            "result": "Passed basic pattern checks.",
            "score_contribution": 0
        })

    # --- Finalize the result object ---
    severity = calculate_severity(risk_score)
    verdict = "clean"
    if severity in ["HIGH", "CRITICAL"]:
        verdict = "malicious"
    elif severity in ["MEDIUM", "LOW"]:
        verdict = "suspicious"

    summary = "URL analysis complete."
    if summary_points:
        summary = "URL flagged due to: " + ", ".join(summary_points) + "."

    print(f"--- Analysis Complete for: {url} ---")
    print(f"--- Verdict: {verdict}, Score: {risk_score} ---")
    
    # Return the new, fully compliant object
    return {
        "final_verdict": verdict,
        "risk_score": risk_score,
        "severity": severity,
        "summary": summary,
        "details": details
    }