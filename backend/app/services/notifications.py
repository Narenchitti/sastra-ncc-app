import os
import httpx
import logging
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("app.notifications")

def send_discord_notification(title: str, description: str, color: int = 3447003):
    """
    Sends a rich embed notification to a Discord channel via Webhook.
    This operation is non-blocking and executes in the background.
    """
    webhook_url = os.getenv("DISCORD_WEBHOOK_URL")
    if not webhook_url:
        # Silently skip if webhook is not configured
        return

    payload = {
        "embeds": [
            {
                "title": f"🎖️ SASTRA NCC: {title}",
                "description": description,
                "color": color,
                "footer": {
                    "text": "SASTRA NCC Command Center"
                }
            }
        ]
    }

    async def _send():
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(webhook_url, json=payload)
                if res.status_code != 204:
                    logger.warning(f"Discord Webhook returned status code {res.status_code}: {res.text}")
        except Exception as e:
            logger.warning(f"Failed to post to Discord Webhook: {e}")

    try:
        # Schedule the coroutine to run on the active event loop in the background
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_send())
        else:
            asyncio.run(_send())
    except Exception as e:
        logger.warning(f"Failed to schedule background notification task: {e}")

def send_email_notification(to_email: str, subject: str, html_body: str):
    """
    Sends an HTML email notification via SMTP.
    This runs asynchronously/in-background to keep the endpoint responsive.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")

    # Fallback to local server logging if credentials are missing
    if not smtp_host or not smtp_user or not smtp_password:
        logger.info(f"Mock SMTP Outgoing Email to <{to_email}>:")
        logger.info(f"Subject: {subject}")
        logger.info(f"Body: {html_body[:200]}...")
        return

    # Compile MIME message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🎖️ SASTRA NCC: {subject}"
    msg["From"] = smtp_user
    msg["To"] = to_email

    part = MIMEText(html_body, "html")
    msg.attach(part)

    async def _send():
        try:
            port = int(smtp_port)
            if port == 465:
                server = smtplib.SMTP_SSL(smtp_host, port, timeout=10.0)
            else:
                server = smtplib.SMTP(smtp_host, port, timeout=10.0)
                server.ehlo()
                server.starttls()
                server.ehlo()
            
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, to_email, msg.as_string())
            server.quit()
            logger.info(f"Email successfully transmitted to <{to_email}>")
        except Exception as e:
            logger.warning(f"Failed to transmit email to <{to_email}>: {e}")

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_send())
        else:
            asyncio.run(_send())
    except Exception as e:
        logger.warning(f"Failed to schedule email background task: {e}")
