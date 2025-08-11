LeetTracker - static frontend to track LeetCode users
----------------------------------------------------

Files:
- index.html       : single-user dashboard
- compare.html     : compare two users
- index.js / compare.js : JS logic
- style.css        : CSS styling
- proxy.js         : optional Node proxy to avoid CORS issues

How to run locally (recommended):
1) Serve the folder with a static server (preferred) so fetch() works:
   - Using Python 3: python -m http.server 8000
   - Or use VSCode Live Server extension
   Open http://localhost:8000/index.html in your browser.

2) If you encounter CORS issues when fetching LeetCode data, use the included proxy:
   - Install dependencies:
       npm install express node-fetch cors
   - Run proxy:
       node proxy.js
   - Open the site and before scripts run, set window.LEET_PROXY to 'http://localhost:4000'.
     Easiest: open index.html and temporarily add the following in a <script> block before index.js:
       <script>window.LEET_PROXY='http://localhost:4000';</script>

Notes & limitations:
- LeetCode does not provide a clean public endpoint for tag-wise solved counts; this script attempts to use the legacy submissions dump and GraphQL where available.
- Some endpoints or fields can be rate-limited or blocked; using the local proxy is the most reliable option.
- The topic mapping uses a simple substring match to group tags into the selected DS topics.
