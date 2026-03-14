# /file-analysis-service/app/analysis.py

import magic
import oletools.olevba
import exifread

# --- RISK SCORING CONFIGURATION ---
SCORE_THRESHOLDS = {
    "CRITICAL": 90,
    "HIGH": 70,
    "MEDIUM": 40,
    "LOW": 1,
}

RISK_POINTS = {
    "HAS_MACRO": 50,
    "HAS_SUSPICIOUS_MACRO": 30,
    "HAS_AUTOEXEC_MACRO": 40,
    "HAS_GPS_METADATA": 60, # High score for OPSEC violation
    "HAS_DEVICE_METADATA": 25,
}

def calculate_severity(score):
    """Translates a numerical score into a severity level."""
    for severity, threshold in SCORE_THRESHOLDS.items():
        if score >= threshold:
            return severity
    return "INFO"

def analyze_document(file_content):
    """Analyzes MS Office documents for malicious macros."""
    risk_score = 0
    details = []
    summary_points = []

    try:
        vba_parser = oletools.olevba.VBA_Parser('document', data=file_content)
        if vba_parser.detect_vba_macros():
            risk_score += RISK_POINTS["HAS_MACRO"]
            details.append({
                "analyzer_name": "Macro Analysis",
                "result": "VBA macros detected in the document.",
                "score_contribution": RISK_POINTS["HAS_MACRO"]
            })
            summary_points.append("contains macros")

            analysis_results = vba_parser.analyze_macros()
            suspicious_keywords = [res[1] for res in analysis_results if res[0] == 'Suspicious']
            if suspicious_keywords:
                risk_score += RISK_POINTS["HAS_SUSPICIOUS_MACRO"]
                details.append({
                    "analyzer_name": "Suspicious Keyword Analysis",
                    "result": f"Found suspicious keywords: {', '.join(suspicious_keywords)}.",
                    "score_contribution": RISK_POINTS["HAS_SUSPICIOUS_MACRO"]
                })
                summary_points.append("suspicious keywords")

            autoexec_keywords = [res[1] for res in analysis_results if res[0] == 'AutoExec']
            if autoexec_keywords:
                risk_score += RISK_POINTS["HAS_AUTOEXEC_MACRO"]
                details.append({
                    "analyzer_name": "Auto-Execution Analysis",
                    "result": f"Found auto-executing keywords: {', '.join(autoexec_keywords)}.",
                    "score_contribution": RISK_POINTS["HAS_AUTOEXEC_MACRO"]
                })
                summary_points.append("auto-executing macros")

    except Exception as e:
        details.append({"analyzer_name": "Document Analysis", "result": f"Error during analysis: {e}", "score_contribution": 0})

    return risk_score, details, summary_points

def analyze_image(file_object):
    """Analyzes image files for sensitive EXIF metadata."""
    risk_score = 0
    details = []
    summary_points = []
    
    try:
        tags = exifread.process_file(file_object)
        if 'GPS GPSLatitude' in tags:
            risk_score += RISK_POINTS["HAS_GPS_METADATA"]
            details.append({
                "analyzer_name": "EXIF GPS Check",
                "result": "CRITICAL OPSEC RISK: Image contains embedded GPS coordinates.",
                "score_contribution": RISK_POINTS["HAS_GPS_METADATA"]
            })
            summary_points.append("embedded GPS data")

        if 'Image Make' in tags or 'Image Model' in tags:
            risk_score += RISK_POINTS["HAS_DEVICE_METADATA"]
            device_info = f"{tags.get('Image Make', '')} {tags.get('Image Model', '')}".strip()
            details.append({
                "analyzer_name": "EXIF Device Check",
                "result": f"Image contains device metadata: {device_info}",
                "score_contribution": RISK_POINTS["HAS_DEVICE_METADATA"]
            })
            summary_points.append("device metadata")

    except Exception as e:
        details.append({"analyzer_name": "Image Analysis", "result": f"Error during analysis: {e}", "score_contribution": 0})
        
    return risk_score, details, summary_points

def analyze_file(file_object, content_type):
    """Main analysis dispatcher function."""
    file_object.seek(0)
    file_content = file_object.read()
    file_object.seek(0)

    # Use python-magic for reliable file type identification
    mime_type = magic.from_buffer(file_content, mime=True)
    
    risk_score = 0
    details = [{
        "analyzer_name": "File Type Identification",
        "result": f"Detected MIME type: {mime_type}",
        "score_contribution": 0
    }]
    summary_points = []

    # --- Dispatch to the correct analyzer based on MIME type ---
    if 'officedocument' in mime_type or 'msword' in mime_type:
        score, doc_details, doc_summary = analyze_document(file_content)
        risk_score += score
        details.extend(doc_details)
        summary_points.extend(doc_summary)
    
    elif mime_type.startswith('image/'):
        score, img_details, img_summary = analyze_image(file_object)
        risk_score += score
        details.extend(img_details)
        summary_points.extend(img_summary)
    
    else:
        details.append({
            "analyzer_name": "General Analysis",
            "result": "No specific analyzer for this file type yet.",
            "score_contribution": 0
        })

    # --- Finalize the result ---
    severity = calculate_severity(risk_score)
    verdict = "clean"
    if severity in ["HIGH", "CRITICAL"]:
        verdict = "malicious"
    elif severity in ["MEDIUM", "LOW"]:
        verdict = "suspicious"

    summary = "File analysis complete."
    if summary_points:
        summary = "File flagged due to: " + ", ".join(summary_points) + "."

    return {
        "final_verdict": verdict,
        "risk_score": risk_score,
        "severity": severity,
        "summary": summary,
        "details": details
    }