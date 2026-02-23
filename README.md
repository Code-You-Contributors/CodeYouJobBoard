# Code:You Job Board 

Welcome to the **Code:You Job Board**, a dedicated platform designed to help Code:You students and participants find relevant tech job listings, explore interactive hiring analytics, and access valuable career development resources.


## Overview

The Code:You Job Board acts as a central hub connecting tech learners with local and remote employers. It pulls active job postings into a searchable, filterable table, provides an analytics dashboard to view hiring trends (such as salary averages and language demands), and offers a form for employers or admins to easily submit new opportunities.

## Features

* **Interactive Job Board (`jobBoard.html`)**: View, search, and filter job listings dynamically by Pathway (Python, C#, Data, etc.), Location, Salary Range, and Skills. Includes table pagination.
* **Analytics Dashboard (`dashboard.html`)**: A visually engaging dashboard powered by Chart.js. Includes interactive pie, donut, and bar charts detailing job counts by location, programming language breakdowns, and salary distribution.
* **Job Submission Portal (`jobSubmission.html`)**: A secure form for employers/staff to submit new job postings, saving directly to the database and connected Google Sheets.
* **Responsive Design**: Mobile-friendly UI with a custom hamburger menu and responsive CSS grid/flexbox layouts.
* **Staff Directory (`contact.html`)**: Easily connect with the Code:You Career Coaches, Employer Relationship Managers, and Project Managers.

## Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript, Chart.js (Data visualization), Font Awesome (Icons)
* **Backend:** Node.js, Express.js
* **Database:** MongoDB (via Mongoose), Google Sheets API Integration
* **Libraries/Dependencies:** `axios`, `dotenv`, `mongoose`, `express`, `csv-parser`

## 📁 Project Structure

```text
CodeYouJobBoard/
├── assets/imgs/          # Logos, staff photos, and background images
├── models/
│   └── Job.js            # Mongoose Schema for Job listings
├── src/
│   ├── app.js            # Main Express backend server
│   ├── dashboard.js      # Frontend logic for Chart.js dashboard
│   ├── jobBoard.js       # Frontend logic for fetching, filtering, and paginating jobs
│   └── menu.js           # Hamburger menu toggle functionality
├── index.html            # Landing page with career resources
├── jobBoard.html         # Main searchable job listings table
├── dashboard.html        # Interactive analytics page
├── contact.html          # Staff directory
├── jobSubmission.html    # Form to submit new jobs
├── style.css             # Main stylesheet
├── package.json          # Node dependencies and scripts
└── Documentation.MD      # In-depth architectural and file documentation

```

## 💻 Installation & Setup

1. **Clone the repository:**
```bash
git clone https://github.com/KQuiggins/CodeYouJobBoard.git
cd CodeYouJobBoard

```


2. **Install dependencies:**
Make sure you have Node.js installed, then run:
```bash
npm install

```


3. **Set up environment variables:**
Create a `.env` file in the root directory (see [Environment Variables](https://www.google.com/search?q=%23environment-variables) below).
4. **Run the server:**
```bash
npm start

```


*The server will start on `http://localhost:3000` (or your defined PORT).*

## Environment Variables

Create a `.env` file in the root directory and configure the following variables. **Do not commit this file to GitHub** (it is already included in the `.gitignore`).

```env
PORT=3000
DATABASE_URL=<your_mongodb_connection_string>
XLSX_ID=<your_google_spreadsheet_id>
Google_API_KEY=<your_google_api_key>

```

*(Note: Google Sheets API variables are utilized for backend synchronization alongside MongoDB).*

## Usage

* **Accessing the App:** Open a web browser and navigate to `http://localhost:3000`.
* **Browsing Jobs:** Navigate to the "Job Board" tab to view current listings. Use the drop-down filters or the search bar to narrow down opportunities.
* **Viewing Analytics:** Click on the "Dashboard" tab. You can click on the Chart slices (e.g., a specific location or language) to automatically filter the data table below the charts.
* **Submitting a Job:** Navigate to `jobSubmission.html` (admin/employer use) to fill out the form. Upon submission, it will POST to the `/api/jobs` endpoint, saving to MongoDB and a connected Google Sheet.
