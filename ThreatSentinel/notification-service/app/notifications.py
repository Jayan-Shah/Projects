# /notification-service/app/notifications.py

import json

def format_alert(incident_data: dict) -> str:
    """Formats a notification message based on the analysis verdict and incident type."""
    verdict = incident_data.get("final_verdict")
    user_id = incident_data.get("submitted_by")
    
    incident_type = incident_data.get("incident_type", "url")
    evidence_text = ""

    # This block correctly determines what was submitted
    if incident_type == "file":
        filename = incident_data.get("submitted_text")
        evidence_text = f"The FILE you submitted ('{filename}') has been analyzed."
    else:
        url = incident_data.get("url")
        evidence_text = f"The URL you submitted ('{url}') has been analyzed."

    # --- THIS IS THE FIX ---
    # All templates below now use the generic 'evidence_text' variable, making them universal.
    if verdict == "malicious":
        subject = "CRITICAL CYBER ALERT: Malicious Content Detected"
        body = (
            f"ALERT for user '{user_id}':\n\n"
            f"{evidence_text}\n\n"
            f"**VERDICT: MALICIOUS**\n\n"
            f"**IMMEDIATE ACTION REQUIRED:**\n"
            f"1. If this was a file, DELETE it immediately.\n"
            f"2. If you clicked a link and entered credentials, change your passwords NOW.\n"
            f"3. Run an antivirus scan on your device.\n\n"
            f"This incident has been escalated to CERT-Army."
        )
    elif verdict == "suspicious":
        subject = "Cyber Warning: Suspicious Content Detected"
        body = (
            f"WARNING for user '{user_id}':\n\n"
            f"{evidence_text}\n\n"
            f"**VERDICT: SUSPICIOUS**\n\n"
            f"**RECOMMENDED ACTION:**\n"
            f"1. Do not open the file or enter personal information on the site.\n"
            f"2. We are continuing to monitor this and similar threats.\n\n"
            f"Thank you for your vigilance."
        )
    else: # clean, unknown, etc.
        subject = "Cyber Report Update: Analysis Complete"
        body = (
            f"UPDATE for user '{user_id}':\n\n"
            f"{evidence_text}\n\n"
            f"**VERDICT: {verdict.upper()}**\n\n"
            f"No immediate threat was detected. Thank you for helping keep our network secure."
        )
    
    return f"\n--- SIMULATING NOTIFICATION ---\nSUBJECT: {subject}\nBODY:\n{body}\n--- END SIMULATION ---\n"

def send_notification(incident_data: dict):
    """Simulates sending a notification."""
    formatted_message = format_alert(incident_data)
    print(formatted_message)