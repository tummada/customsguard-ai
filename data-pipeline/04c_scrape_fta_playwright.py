"""Intercept NTR API calls via Playwright to find actual rate data endpoint"""
import os, sys, json, asyncio
sys.path.insert(0, os.path.dirname(__file__))

async def main():
    from playwright.async_api import async_playwright

    print("Starting Playwright...", flush=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
        )
        page = await context.new_page()

        # Intercept ALL network requests to find the data API
        api_responses = []

        async def handle_response(response):
            url = response.url
            # Skip static assets
            if any(ext in url for ext in [".css", ".js", ".png", ".jpg", ".woff", ".svg", ".gif", "google", "gtag"]):
                return
            try:
                ct = response.headers.get("content-type", "")
                status = response.status
                print(f"  [{status}] {ct[:30]:30s} {url[:120]}")
                if "json" in ct or "application/json" in ct:
                    body = await response.json()
                    api_responses.append({"url": url, "data": body})
                    print(f"    JSON: {json.dumps(body, ensure_ascii=False)[:300]}")
            except:
                pass

        page.on("response", handle_response)

        # Load search page
        print("\nLoading search for HS 0306...\n", flush=True)
        await page.goto(
            "https://www.thailandntr.com/en/goods/tariff/search?hs=0306",
            wait_until="domcontentloaded",
            timeout=60000,
        )
        # Wait for Vue.js rendering
        await page.wait_for_timeout(8000)

        # Check what's rendered
        visible = await page.evaluate("() => document.body.innerText")
        lines = [l.strip() for l in visible.split("\\n") if l.strip()]
        print(f"\n=== Visible text ({len(lines)} lines) ===")
        for line in lines:
            if any(kw in line.lower() for kw in ["rate", "duty", "%", "mfn", "0306", "preferential", "tariff_no", "hscode"]):
                print(f"  >>> {line[:200]}")

        # Also dump all tables found
        tables_info = await page.evaluate("""() => {
            const results = [];
            const tables = document.querySelectorAll('table');
            for (let t = 0; t < tables.length; t++) {
                const rows = tables[t].querySelectorAll('tr');
                const tableData = [];
                for (let r = 0; r < Math.min(rows.length, 5); r++) {
                    const cells = Array.from(rows[r].querySelectorAll('th, td'))
                        .map(c => c.textContent.trim().substring(0, 50));
                    tableData.push(cells);
                }
                results.push({rows: rows.length, sample: tableData});
            }
            return results;
        }""")
        print(f"\n=== Tables ({len(tables_info)}) ===")
        for i, t in enumerate(tables_info):
            print(f"Table {i}: {t['rows']} rows")
            for row in t["sample"]:
                print(f"  {row}")

        # Save API responses
        if api_responses:
            print(f"\n=== API JSON responses: {len(api_responses)} ===")
            with open("/tmp/ntr_api_responses.json", "w") as f:
                json.dump(api_responses, f, ensure_ascii=False, indent=2)
            print("Saved to /tmp/ntr_api_responses.json")

        # Take screenshot
        await page.screenshot(path="/tmp/ntr_page.png", full_page=True)
        print("Screenshot: /tmp/ntr_page.png")

        await browser.close()

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
