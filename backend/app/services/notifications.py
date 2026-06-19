import os
import httpx
import logging
import asyncio

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
