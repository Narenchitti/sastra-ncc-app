import feedparser
from typing import List, Dict, Any
import httpx
import re

async def get_army_news() -> List[Dict[str, Any]]:
    rss_url = "https://pib.gov.in/Rss/RssFeed.aspx?ModId=8"
    try:
        # feedparser can take a URL, but for async consistency we can fetch it
        async with httpx.AsyncClient() as client:
            response = await client.get(rss_url)
            feed = feedparser.parse(response.text)
            
        news_items = []
        for entry in feed.entries[:5]:
            image_url = None
            if 'enclosures' in entry and entry.enclosures:
                image_url = entry.enclosures[0].get('url')
            
            if not image_url and 'content' in entry:
                img_match = re.search(r'src=["\']([^"\']+)["\']', entry.content[0].value)
                if img_match:
                    image_url = img_match.group(1)
            
            news_items.append({
                "title": entry.title,
                "link": entry.link,
                "pubDate": entry.get('published', entry.get('pubDate')),
                "content": entry.get('summary', entry.get('description')),
                "imageUrl": image_url
            })
        return news_items
    except Exception as e:
        print(f"News Fetch Error: {e}")
        return []
