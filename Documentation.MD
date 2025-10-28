## Backend (app.js)
Overview
The app.js file runs the main backend server for YouJobBoard.
It uses Express to serve the front-end pages and provides a small API that connects to a Google Sheet where all job listings are stored.
This setup lets the front-end pull real data (employers, job titles, salaries, etc.) without needing a full database yet.

What it Does
- Starts a Node.js Express server
- Loads environment variables from .env
- Serves static files from the /public folder
- Handles two main routes:
    - the main page (/)
    - the Google Sheets API endpoint (/api/sheet)
- Uses axios to make requests to the Google Sheets API
- Logs helpful info in the console when starting the server
  
Environment Variables
You’ll need a .env file at the project root that contains:
    PORT=3000
    XLSX_ID=<your_google_spreadsheet_id>
    Google_API_KEY=<your_google_api_key>
Make sure .env is included in .gitignore so it doesn’t get pushed to GitHub.

Endpoints
Route	    Method	Description
/	        GET	    Serves the main page (index.html)
/api/sheet	GET	    Retrieves job listings from the connected Google Sheet

How It Works 
1. When you start the server, it serves everything inside /public.
2. Visiting the root URL (/) loads index.html.
3. The front-end JS sends a request to /api/sheet to fetch job data.
4. The server makes a call to the Google Sheets API and returns the JSON data.
5. That JSON data is then used to populate the job listings dynamically on the page.

Error Handling
If there’s a problem connecting to the Google Sheets API, the server logs an error and returns a simple JSON message:
    { "error": "Error fetching Google Sheet" }

Notes for Team
- The server runs fine without MongoDB for now (Google Sheets is acting as the database).
- Keep the API key private.
- If the Google Sheet’s columns change, you might need to adjust the range in app.js.
- Always restart the server after updating .env.