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

