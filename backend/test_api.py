import asyncio
from app.main import app
from httpx import AsyncClient, ASGITransport

async def test():
    from app.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "test"}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        resp = await c.get('/api/social/connection-status')
        print("Status:", resp.json())
        resp2 = await c.get('/api/social/?status=published')
        print("Posts status code:", resp2.status_code)
        if resp2.status_code != 200:
            print("Posts error:", resp2.json())
        else:
            posts = resp2.json()
            print("Posts count:", len(posts))
            if posts:
                print("First few platforms:", [p.get('platforms') for p in posts[:10]])

if __name__ == "__main__":
    asyncio.run(test())
