# CODE:You Job Board Documentation

## index.html
/**
 * @file index.html
 * @description Homepage of the CODE:You Job Board project. 
 * Provides navigation, helpful links, and job-hunting resources for students and participants.
 *
 * @section Overview
 * This page introduces users to the CODE:You Job Board, guiding them toward 
 * job listings, resources, and professional development support. 
 * It includes helpful links for resume preparation, job search tips, and 
 * Code:You career resources.
 *
 * @section Layout
 * - **Aside Navigation:** Contains Code:You logos and navigation links:
 *   - Home (`index.html`)
 *   - Job Board (`jobBoard.html`)
 *   - Dashboard (`dashboard.html`)
 *   - Contact Us (`contact.html`)
 *
 * - **Main Content:** Organized into multiple `<section>` blocks:
 *   1. **Welcome Section:** Displays a banner image, title, and introduction text.
 *   2. **Helpful Links:** Lists key career resources and external reference links.
 *   3. **Job Hunt Tips:** Provides advice on resume tailoring, job tracking, and networking.
 *   4. **Support Services:** Outlines how Code:You can assist — resume reviews, mock interviews, 
 *      project collaboration, and career guidance.
 *
 * - **Footer:** Displays copyright.
 * - **Hamburger Menu:** Provides responsive navigation for smaller screens.
 *
 * @section Assets
 * - Images:
 *   - `/assets/imgs/cy-logo-dstacked-color.png`
 *   - `/assets/imgs/cy-logo-horz-color.png`
 *   - `/assets/imgs/miles-manwaring-iWpF3D_M-1g-unsplash.jpg`
 *
 * @dependencies
 * - **CSS:** `/public/style.css`
 * - **Fonts:** Google Fonts (Roboto, Share Tech Mono)
 * - **Icons:** Font Awesome 6.5.0
 * - **JS:** `/src/menu.js` for hamburger menu functionality
 *
 * @note 
 * - All external links open in new tabs (`target="_blank"`).
 * - Ensure responsive behavior using the linked CSS and menu.js script.
 * - Validate accessibility (alt text, link contrast, etc.) when updating assets.
 */


 ## jobBoard.html
 /**
 * @file jobBoard.html
 * @description Displays the main job listings page for the CODE:You Job Board project. 
 * Provides dynamic filtering, searching, and data visualization for available jobs 
 * retrieved via the backend API (Google Sheets or MongoDB).
 *
 * @section Overview
 * The Job Board page serves as the central hub where users can view, search, 
 * and filter active job listings. Data is dynamically populated into a table 
 * using JavaScript that fetches listings from the API.
 *
 * @section Layout
 * - **Aside Navigation:** 
 *   - Displays Code:You logos and navigation links.
 *   - Current active page: Dashboard (`dashboard.html`).
 *
 * - **Header Section:**
 *   - Page title (“Job Listings”)
 *   - Search input for job title, company, or skills
 *   - Real-time stats displaying:
 *     - Number of available jobs
 *     - Pay range
 *     - Skills extracted from job data
 *
 * - **Filter Section:**
 *   - Drop-down menus for filtering by:
 *     - Pathway (Python, C#, JavaScript, PHP, Web, etc.)
 *     - Location (Remote, Louisville, Central KY, etc.)
 *     - Pay Range (Min/Max salary)
 *     - Skills (Programming or soft skills)
 *
 * - **Job Table Section:**
 *   - Displays all job listings in tabular format:
 *     | Date | Employer | Job Title | Pathway | Language | Salary Range | Contact Person | Location | Apply |
 *   - Jobs are dynamically populated via `jobBoard.js`.
 *   - Includes pagination controls for browsing multiple pages of results.
 *
 * - **Footer:** 
 *   - Displays © 2025 Code:You notice.
 *   - Hamburger menu for responsive navigation on mobile.
 *
 * @section Assets
 * - **Images:**
 *   - `/assets/imgs/cy-logo-dstacked-color.png`
 *   - `/assets/imgs/cy-logo-horz-color.png`
 *
 * @dependencies
 * - **CSS:** `/public/style.css`
 * - **Fonts:** Google Fonts (Roboto, Share Tech Mono)
 * - **Icons:** Font Awesome 6.5.0
 * - **JavaScript:**
 *   - `/src/menu.js` (handles hamburger navigation)
 *   - `/src/jobBoard.js` (fetches and populates job data)
 *
 * @data
 * - Job data is fetched from the backend API endpoint (`/api/sheet` or MongoDB version).
 * - Dynamic counts and filters update based on live data.
 *
 * @note
 * - Ensure IDs (`#searchInput`, `#job-count`, `#pay-range`, etc.) are not renamed unless updated in `jobBoard.js`.
 * - Tables use `.no-display` and `.job-data-status` for load-state toggling.
 */


## dashboard.html
/**
 * @file dashboard.html
 * @description Interactive analytics dashboard for the CODE:You Job Board project.
 * Displays charts, filters, and tabular summaries of job data retrieved from the backend API.
 *
 * @section Overview
 * The Dashboard page visualizes job listings data from the API (Google Sheets or MongoDB),
 * providing users with real-time insights such as job counts, salary ranges, and distributions
 * by programming language and location. It includes dynamic charts powered by Chart.js
 * and allows filtering by date, location, language, and salary.
 *
 * @section Layout
 * - **Aside Navigation:**
 *   - Displays Code:You logos and main nav links.
 *   - Highlights "Dashboard" as the active page.
 *   - Includes a tip reminding users they can click chart slices to filter results.
 *
 * - **Header Section:**
 *   - Page title (“Jobs Dashboard”) and short description.
 *
 * - **Date Range Section:**
 *   - "From" and "To" date pickers for filtering jobs by posting date.
 *   - Inline warning (`#dateWarning`) for invalid ranges.
 *   - Loading overlay (`#loadingOverlay`) displayed while initializing charts and data.
 *   - Displays current job count dynamically.
 *
 * - **Filters Row:**
 *   - Drop-down menus for filtering by Language, Location, and Salary.
 *   - "Clear All Filters" button resets all filters and refreshes results.
 *
 * - **Charts Section:**
 *   - Grid layout containing three Chart.js visualizations:
 *     1. **Pie Chart:** Job count by Location (`#pieChart`)
 *     2. **Donut Chart:** Programming language breakdown (`#donutChart`)
 *     3. **Bar Chart:** Salary distribution (`#barChart`)
 *
 * - **Table Section:**
 *   - Mirrors the `jobBoard.html` table design.
 *   - Populated dynamically via `dashboard.js`.
 *   - Table headers (`#dashboardTableHeadRow`) and rows (`#dashboardJobTableBody`)
 *     generated from the live dataset.
 *   - Includes pagination controls and data status messages.
 *
 * - **Footer:**
 *   - Standard © 2025 Code:You notice and responsive hamburger menu.
 *
 * @section Assets
 * - **Images:**
 *   - `/assets/imgs/cy-logo-dstacked-color.png`
 *   - `/assets/imgs/cy-logo-horz-color.png`
 *
 * @dependencies
 * - **CSS:** `/public/style.css`
 * - **Fonts:** Google Fonts (Roboto, Share Tech Mono)
 * - **Icons:** Font Awesome 6.5.0
 * - **Libraries:**
 *   - Chart.js (CDN)
 *   - chartjs-plugin-datalabels v2.2.0
 * - **JavaScript:**
 *   - `/src/menu.js` (handles navigation)
 *   - `/src/dashboard.js` (fetches data and renders charts)
 *
 * @data
 * - Job data fetched from the backend `/api/sheet` or database.
 * - Chart.js datasets update automatically based on active filters.
 *
 * @note
 * - Ensure the Chart.js plugin is loaded before `dashboard.js`.
 * - Accessibility: `aria-live` and `aria-hidden` attributes used for dynamic regions.
 */


 ## jobSubmission.html
 /**
 * @file jobSubmission.html
 * @description Job submission form for the CODE:You Job Board project. 
 * Allows employers or administrators to add new job listings directly to 
 * the connected Google Sheet through a Google Apps Script endpoint.
 *
 * @section Overview
 * The Job Submission page provides a simple, styled HTML form that collects 
 * job listing data such as employer, title, pathway, salary range, and 
 * contact information. When submitted, the form sends data to a Google Apps 
 * Script (`/exec` URL), which automatically updates the master job listings 
 * sheet.
 *
 * @section Layout
 * - **Form (id="jobForm"):**
 *   - Contains labeled input fields for:
 *     - Employer (text, required)
 *     - Job Title (text, required)
 *     - Pathway (dropdown: Software, Web, Data, PHP)
 *     - Language (text, required)
 *     - Salary Range (text, required)
 *     - Contact Person (optional)
 *     - Location (optional)
 *     - Application Link (required)
 *   - Submit button triggers a POST request to the Google Apps Script endpoint.
 *   - Uses a hidden `<iframe>` (`name="hidden_iframe"`) to prevent page reload after submission.
 *
 * @section Behavior
 * - Includes a small inline `<script>` that:
 *   1. Listens for the form submission event.
 *   2. Displays an alert ("Form submitted! Check your Google Sheet.") after a short delay.
 *   3. Resets the form fields after submission.
 *
 * @section Styles
 * - Defined directly within the `<style>` tag at the bottom of the file.
 * - Applies a clean, card-like form layout with the following features:
 *   - Centered form with a maximum width of 600px.
 *   - Soft shadow and rounded corners.
 *   - Gradient submit button with hover elevation.
 *   - Responsive adjustments for screens under 768px.
 *
 * @section Accessibility
 * - Uses clear label associations for all input fields.
 * - Color variables reference global CSS custom properties where available.
 * - Responsive layout ensures mobile usability.
 *
 * @dependencies
 * - Google Apps Script endpoint for job submissions:
 *   https://script.google.com/macros/s/AKfycbzwlPYcOFv6npeUz4K3mSQwCcKRRhDemaHcsHCFRbXSFvri25zwI1WaVTH8EXqz_WU2ug/exec
 *
 * @note
 * - The Google Sheet integration must be active and accessible for successful submissions.
 * - Consider converting it to MongoDB.
 */


 ## contact.html
 /**
 * @file contact.html
 * @description Contact page for the CODE:You Job Board project. 
 * Displays the current CODE:You staff team, including managers, career coaches, 
 * and project leads, along with their roles and Slack handles for communication.
 *
 * @section Overview
 * The Contact page serves as a directory for students and contributors to connect 
 * with CODE:You staff. Each team member is presented with a photo, full name, 
 * title, and Slack username for internal collaboration and mentorship support.
 *
 * @section Layout
 * - **Aside Navigation:**
 *   - Displays CODE:You logos (stacked and horizontal).
 *   - Navigation links:
 *     - Home (`index.html`)
 *     - Job Board (`jobBoard.html`)
 *     - Dashboard (`dashboard.html`)
 *     - Contact Us (`contact.html`) — active page.
 *
 * - **Main Content Section:**
 *   - Title: “CODE:You Staff”
 *   - Grid of staff profile cards (`.staff-cards`), each containing:
 *     - Profile photo (`.staff-photo`)
 *     - Full name (`<h3>`)
 *     - Role / job title
 *     - Slack handle for internal messaging
 *
 *   - Staff members featured:
 *     1. Shannon Sheehy – Manager of Strategic Partnerships  
 *     2. Alli Rippy – Employer Relationships  
 *     3. Kandi Hall – Technical Career Coach  
 *     4. Jenny Terry – Technical Career Coach  
 *     5. David York – Technical Project Manager  
 *     6. Danny Morton – Technical Project Manager
 *
 * - **Footer:**
 *   - Displays © 2025 Code:You notice.
 *   - Hamburger menu icon for responsive navigation on mobile screens.
 *
 * @section Assets
 * - **Images:**
 *   - `/assets/imgs/shannon-photo.jpg`
 *   - `/assets/imgs/alli-photo.jpg`
 *   - `/assets/imgs/jenny-photo.jpg`
 *   - `/assets/imgs/david-photo.jpg`
 *   - `/assets/imgs/DannyMorton1.jpg`
 *   - `/assets/imgs/cy-logo-dstacked-color.png`
 *   - `/assets/imgs/cy-logo-horz-color.png`
 *
 * @dependencies
 * - **CSS:** `/public/style.css`
 * - **Fonts:** Google Fonts (Roboto, Share Tech Mono)
 * - **Icons:** Font Awesome 6.5.0
 * - **JavaScript:** `/src/menu.js` (controls hamburger menu behavior)
 *
 * @note
 * - Update staff list and images as team members change.
 * - Optimize and compress all photos for web performance.
 * - Maintain consistent naming conventions for images and Slack handles.
 */



