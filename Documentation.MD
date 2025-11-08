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
 * - Future enhancement: add sorting and “save job” functionality.
 */

