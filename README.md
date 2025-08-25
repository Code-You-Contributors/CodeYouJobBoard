# Code:You Job Board

A web-based job board application that fetches job listings from Google Sheets and displays them in a user-friendly interface.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A Google Cloud Console account with Sheets API enabled
- A Google API Key with access to Google Sheets API

## Getting Started

### 1. Clone the Repository
``` bash
git clone https://github.com/dmorton714/CodeYouJobBoard.git

cd CodeYouJobBoard
```


### 2. Install Dependencies
``` bash
npm install
```


### 3. Set Up Environment Variables
Create a `.env` file in the root directory with the following variables:
``` bash
Google_API_KEY=your_google_api_key_here

XLSX_ID=your_google_spreadsheet_id_here 

PORT=3000
```

**To get these values:**
- **Google_API_KEY**: Create an API key in [Google Cloud Console](https://console.cloud.google.com/) with Google Sheets API enabled
- **XLSX_ID**: Extract from the Google Sheets URL: `https://docs.google.com/spreadsheets/d/[XLSX_ID]/edit`

### 4. Run the Development Server
``` bash
npm start
```

**As an alternative to `npm`, I use `nodemon` when running the env**
- for more info on `nodemon`, visit Nodemon's website (https://nodemon.io/) 

**To use `nodemon`**
- Simply run `npm i nodemon` to install it to the project (be sure you're in the root dir)
- Now, to run the dev server, simply execute `nodemon src/app` to start the server OR simply execute `npm run dev`

The application will be available at `http://localhost:3000`

## Project Structure
``` bash
code-you-job-board/
├─ src/
│  └─ app.js                # Express server & API endpoints
├─ public/
│  ├─ index.html            # Main HTML file
│  ├─ styles.css            # Stylesheets
│  └─ script.js             # Client-side JavaScript
├─ imgs/                    # Static image assets
├─ .env                     # Environment variables (not in repo)
├─ package.json             # Node.js dependencies & scripts
└─ README.md
```



### Why This Structure?

- **`src/` directory**: Contains all server-side code. This separation keeps backend logic organized and distinct from frontend assets.

- **`public/` directory**: Holds all static files served directly to the browser. Express is configured to serve this directory statically, meaning files here are accessible via their path (e.g., `/styles.css`).

- **`index.html` in public**: Since it's a static file that doesn't require server-side processing, it lives in the public directory. Express serves it directly when users visit the root URL (`/`).

- **Why do we not put `index.html` in the root dir??**: When Express serves static files, you explicitly define which directories are publicly accessible. By keeping frontend files in `public/`, you:
    - Prevent accidental exposure of sensitive files (`.env`, `package.json`, server code)
    - Create a clear security boundary - only files in `public/` are served to browsers
    - Avoid serving your entire project directory to the internet


### Why JavaScript Files are in `public/js/`

The JavaScript files in `public/js/` are **client-side code** that runs in the browser, not on the server. Here's how to distinguish them:

**Client-side JavaScript (belongs in `public/`):**
- Uses browser APIs like `document`, `window`, `fetch()`
- Manipulates the DOM (e.g., `document.getElementById()`)
- Is loaded via `<script>` tags in HTML files
- Uses global objects for module organization
- Handles user interactions and updates the UI

**Server-side JavaScript (belongs in `src/`):**
- Uses Node.js modules (`require()`, `module.exports`)
- Accesses file system, databases, or other server resources
- Handles HTTP requests and responses
- Uses Node.js-specific APIs

In this project:
- `src/app.js` runs on the server with Node.js and Express
- `public/js/` files run in the user's browser and handle the interactive job board interface

This separation ensures clear boundaries between frontend and backend code, making the project easier to understand and maintain.

- **`imgs/` directory**: Separate from public to organize image assets. The server explicitly serves this directory at the `/imgs` route.

- **Environment variables**: Sensitive data like API keys are stored in `.env` (never committed to version control) to keep credentials secure.

## API Endpoints

### GET `/`
Serves the main job board interface (`index.html`)

### GET `/api/sheet`
Fetches job data from Google Sheets
- Query Parameters:
  - `range` (optional): Specify the sheet range (default: 'JobBoard!A:I')
- Returns: JSON data from the specified Google Sheet

### GET `/imgs/*`
Serves static images from the imgs directory

## Development Workflow

1. Make changes to frontend files in `public/`
2. Modify server logic in `src/app.js`
3. The server will need to be restarted for backend changes (consider using `nodemon` for auto-restart, like I mentioned in step 4: Run the Development Server)
4. Test API endpoints using browser or tools like Postman

## Resources

- [Project Slides](https://docs.google.com/presentation/d/13WTYN0lMPE1Vmo3Dw1vGOsK3SeuuSBtYxrPRLOgdWDQ/edit?usp=sharing)
- [Job Board Google Sheet](https://docs.google.com/spreadsheets/d/1OHIJj0D0Q-2lHgSL184vxBaxhIdSYqzso3UJvcRUflo/edit?usp=sharing)
- [GitHub Workflow Guide](https://docs.google.com/document/d/1sxmOdZr19dFgSs4NCmIMr-q76K5f_H2aBh16EIBzsMk/edit?usp=sharing)
- [Employee Partners Data](https://docs.google.com/spreadsheets/d/1z8zZjTU_wLM7ebcGTa3i17JzyvaJfdxn5bmicQwNV94/edit?usp=sharing)

## Troubleshooting

- **"Missing required environment variables" error**: Ensure your `.env` file exists and contains both `Google_API_KEY` and `XLSX_ID`
- **"Error fetching Google Sheet"**: Verify your API key has access to Google Sheets API and the spreadsheet ID is correct
- **Port already in use**: Change the PORT in your `.env` file or stop other processes using port 3000