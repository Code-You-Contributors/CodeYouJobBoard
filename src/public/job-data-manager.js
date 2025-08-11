// Handles fetching, caching, displaying, and filtering job data

const JobDataManager = {
    // Config handlers
    STORAGE_KEY: 'codeyou_job_data',
    TIMESTAMP_KEY: 'codeyou_job_data_timestamp',
    // 5 minutes in milliseconds
    CACHE_DURATION: 0.5 * 60 * 1000,
    // Number of jobs to display per page
    JOBS_PER_PAGE: 15,
    // Auto-hide dates that are >= 30 days old
    AUTO_DEACTIVATE_DAYS: 30,

    // Data storage
    fullData: null,
    allHeaders: [],
    allRows: [],
    filteredRows: [],

    /**
     * Fetch job data from the google sheets API
     * @returns {Promise<Object>} The job data from Google Sheets
     */
    async fetchJobData() {
        try {
            const response = await fetch('/api/sheet');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Successfully fetched data from API');
            console.log(`Total columns: ${data.values ? data.values.length : 0}`);
            console.log(`Total rows: ${data.values && data.values[0] ? data.values[0].length - 1 : 0}`);
            return data;
        } catch (error) {
            console.error('Error fetching job data from API:', error);
            // Fallback to local data.json if API fails
            return this.fetchFallbackData();
        }
    },

    /**
     * Fetch fallback data from local data.json
     * @returns {Promise<Object|null>} The fallback data or null
     */
    async fetchFallbackData() {
        try {
            console.log('Attempting to load fallback data from data.json...');
            const response = await fetch('./data.json');
            const fallbackData = await response.json();

            // Transform data.json format to match Google Sheets API format
            if (fallbackData.headers && fallbackData.values) {
                console.log('Successfully loaded fallback data');
                // Combine headers with values (headers become first row of each column)
                const transformedValues = fallbackData.values.map((col, index) => {
                    return [fallbackData.headers[index], ...col];
                });
                return {
                    range: fallbackData.range || "JobBoard!A:I",
                    majorDimension: fallbackData.majorDimension || "COLUMNS",
                    values: transformedValues
                };
            }
            return fallbackData;
        } catch (error) {
            console.error('Failed to load fallback data:', error);
            return null;
        }
    },

    /**
     * Store job data in sessionStorage with timestamp
     * @param {Object} data - The job data to store
     */
    storeJobData(data) {
        try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            sessionStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
            console.log('Job data cached successfully');
        } catch (error) {
            console.error('Error storing job data in sessionStorage:', error);
            // SessionStorage might be full or disabled
        }
    },

    /**
     * Retrieve job data from sessionStorage if still valid
     * @returns {Object|null} The cached job data or null if expired/missing
     */
    getCachedJobData() {
        try {
            const timestamp = sessionStorage.getItem(this.TIMESTAMP_KEY);
            const data = sessionStorage.getItem(this.STORAGE_KEY);

            if (!timestamp || !data) {
                return null;
            }

            // Check if cache is still valid
            const age = Date.now() - parseInt(timestamp);
            if (age > this.CACHE_DURATION) {
                console.log('Cache expired, will fetch fresh data');
                this.clearCache();
                return null;
            }

            console.log(`Using cached data (${Math.round(age / 1000)} seconds old)`);
            return JSON.parse(data);
        } catch (error) {
            console.error('Error retrieving cached data:', error);
            return null;
        }
    },

    /**
     * Clear cached data
     */
    clearCache() {
        sessionStorage.removeItem(this.STORAGE_KEY);
        sessionStorage.removeItem(this.TIMESTAMP_KEY);
        console.log('Cache cleared');
    },

    /**
     * Extract headers and data from Google Sheets API response
     * @param {Object} data - Raw API response
     * @returns {Object} Object with headers array and rows array
     */
    extractHeadersAndData(data) {
        const values = data.values || [];
        const majorDimension = (data.majorDimension || 'ROWS').toUpperCase();

        if (majorDimension === 'COLUMNS') {
            // Headers are the first item in each column
            const headers = values.map(col => col[0] || '');

            // Data rows are everything after the first item
            const maxLength = Math.max(...values.map(col => col.length - 1));
            const rows = [];

            for (let i = 1; i <= maxLength; i++) {
                const row = [];
                for (let j = 0; j < values.length; j++) {
                    row.push(values[j][i] || '');
                }
                rows.push(row);
            }

            return { headers, rows };
        } else {
            // For ROWS format, first row is headers
            const headers = values[0] || [];
            const rows = values.slice(1);
            return { headers, rows };
        }
    },

    /** Parse the dates from the API into a Date object, following a U.S. date format of "08/10/2025" */
    parseUSDate (dateStr) {
        if (!dateStr) return null;

        let d = new Date(dateStr);
        if (!isNaN(d)) {
            d.setHours(0, 0, 0, 0);
            return d;
        }

        // Creating a fallback for date formats that are not mm/dd/yyyy:
        const m = String(dateStr).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
        if (!m) return null;
        const mm = parseInt(m[1], 10) - 1;
        const dd = parseInt(m[2], 10);
        let yyyy = parseInt(m[3], 10);
        if (yyyy < 100) yyyy += 2000;

        d = new Date(yyyy, mm, dd);
        d.setHours(0, 0, 0, 0);
        return isNaN(d) ? null : d;
    },

    /** Mark “Deactivate?” TRUE if job date is >= N days ago */
    applyAutoDeactivation() {
        // Find the date column (support either "Date" or "Date Posted")
        const dateIndex =
            this.allHeaders.indexOf('Date') !== -1
            ? this.allHeaders.indexOf('Date')
            : this.allHeaders.indexOf('Date Posted');

        if (dateIndex === -1) return; // no date column, nothing to do

        // Ensure we have a Deactivate? column; add it if missing
        let deactivateIndex = this.allHeaders.indexOf('Deactivate?');
        if (deactivateIndex === -1) {
            this.allHeaders.push('Deactivate?');
            deactivateIndex = this.allHeaders.length - 1;
            this.allRows.forEach(row => row[deactivateIndex] = 'FALSE');
        }

        // Compute cutoff: today minus N days, compare at midnight
        const cutoff = new Date();
        cutoff.setHours(0, 0, 0, 0);
        cutoff.setDate(cutoff.getDate() - this.AUTO_DEACTIVATE_DAYS);

        // If job date <= cutoff (i.e., 30+ days old), set 'Deactivate?' to TRUE
        this.allRows = this.allRows.map(row => {
            const d = this.parseUSDate(row[dateIndex]);
            if (d && d <= cutoff) {
            row[deactivateIndex] = 'TRUE';
            }
            return row;
        });
    },

    /**
     * Initialize data fetching on homepage
     * This preloads data in the background
     */
    async initHomePage() {
        console.log('Homepage: Preloading job data in background...');

        // Check if we already have valid cached data
        const cachedData = this.getCachedJobData();
        if (cachedData) {
            console.log('Valid cache found, skipping fetch');
            this.updateHomepageBadge(cachedData);
            return;
        }

        // Fetch fresh data and cache it
        const data = await this.fetchJobData();
        if (data) {
            this.storeJobData(data);
            this.updateHomepageBadge(data);
        }
    },

    /**
     * Update homepage with job count badge
     * @param {Object} data - Job data
     */
    updateHomepageBadge(data) {
        try {
            const processedData = this.extractHeadersAndData(data);
            const deactivateIndex = processedData.headers.indexOf('Deactivate?');
            let activeJobs = processedData.rows;

            if (deactivateIndex !== -1) {
                activeJobs = activeJobs.filter(row => row[deactivateIndex] !== 'TRUE');
            }

            const jobCount = activeJobs.length;

            // Add badge to Job Listings link
            const jobLink = document.querySelector('a[href="/listings.html"]');
            if (jobLink && jobCount > 0) {
                // Remove existing badge if any
                const existingBadge = jobLink.querySelector('.job-count-badge');
                if (existingBadge) {
                    existingBadge.textContent = jobCount;
                } else {
                    jobLink.innerHTML += ` <span class="job-count-badge" style="background: var(--b-orange); color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em;">${jobCount}</span>`;
                }
            }
        } catch (error) {
            console.error('Error updating homepage badge:', error);
        }
    },

    /**
     * Initialize listings page with job data
     */
    async initListingsPage() {
        console.log('Listings page: Loading job data...');

        // Show loading state
        this.showLoadingState();

        // Try to get cached data first
        let data = this.getCachedJobData();

        // If no cached data, fetch it now
        if (!data) {
            console.log('No cached data found, fetching fresh data...');
            data = await this.fetchJobData();
            if (data) {
                this.storeJobData(data);
            }
        }

        // Process and display the data
        if (data) {
            this.processAndDisplayData(data);
        } else {
            this.showErrorMessage();
        }
    },

    /**
     * Process and display all job data
     * @param {Object} data - Raw job data
     */
    processAndDisplayData(data) {
        // Store and process the data
        this.fullData = data;
        const processedData = this.extractHeadersAndData(data);
        this.allHeaders = processedData.headers;
        this.allRows = processedData.rows;

        // Apply the age-based deactivation function for our jobs >= 30 days old
        this.applyAutoDeactivation();

        // Filter out deactivated jobs
        const deactivateIndex = this.allHeaders.indexOf('Deactivate?');
        if (deactivateIndex !== -1) {
            this.allRows = this.allRows.filter(row => row[deactivateIndex] !== 'TRUE');
            console.log(`Filtered out deactivated jobs. Active jobs: ${this.allRows.length}`);
        }

        // Initialize filtered rows with all active rows
        this.filteredRows = [...this.allRows];

        // Display data and setup features
        this.displayJobListings();
        this.updateStatistics();
        this.setupFiltersAndSearch();
    },

    /**
     * Display job listings in the table
     */
    displayJobListings() {
        const table = document.getElementById('jobTable');
        if (!table) return;

        const thead = table.querySelector('thead') || table.createTHead();
        const tbody = table.querySelector('tbody') || table.createTBody();

        thead.innerHTML = '';
        tbody.innerHTML = '';

        // Get rows to display (filtered rows, limited to JOBS_PER_PAGE)
        const rowsToDisplay = this.filteredRows.slice(0, this.JOBS_PER_PAGE);

        // Create header row (exclude Deactivate column)
        const headerRow = document.createElement('tr');
        this.allHeaders.forEach(header => {
            if (header !== 'Deactivate?') {
                const th = document.createElement('th');
                th.textContent = header;
                headerRow.appendChild(th);
            }
        });
        thead.appendChild(headerRow);

        // Create body rows
        rowsToDisplay.forEach(row => {
            const tr = document.createElement('tr');
            this.allHeaders.forEach((header, index) => {
                if (header !== 'Deactivate?') {
                    const td = document.createElement('td');
                    const cellValue = row[index] || '';

                    // Apply special formatting based on column
                    this.formatTableCell(td, header, cellValue);
                    tr.appendChild(td);
                }
            });
            tbody.appendChild(tr);
        });

        console.log(`Displayed ${rowsToDisplay.length} of ${this.filteredRows.length} total active jobs`);
    },

    /**
     * Format table cell based on column type
     * @param {HTMLElement} td - Table cell element
     * @param {string} header - Column header
     * @param {string} value - Cell value
     */
    formatTableCell(td, header, value) {
        switch (header) {
            case 'Date':
            case 'Date Posted':
                td.textContent = value;
                break;
            case 'Employer':
                td.innerHTML = value ? `<a href="#" class="company-link">${value}</a>` : '';
                break;
            case 'Job Title':
                td.className = 'job-title';
                td.textContent = value;
                break;
            case 'Pathway':
                const pathwayClass = this.getPathwayClass(value);
                td.innerHTML = value ? `<span class="pathway-tag ${pathwayClass}">${value}</span>` : '';
                break;
            case 'Salary Range':
                td.className = 'salary';
                td.textContent = value;
                break;
            case 'Location':
                td.className = 'location';
                td.textContent = value;
                break;
            case 'Contact Person':
                td.className = 'contact-person';
                td.textContent = value;
                break;
            case 'Language':
            case 'Skills':
                td.className = 'language-skills';
                td.textContent = value;
                break;
            default:
                td.textContent = value;
        }
    },

    /**
     * Get pathway CSS class based on value
     * @param {string} pathway - Pathway value
     * @returns {string} CSS class name
     */
    getPathwayClass(pathway) {
        const pathwayLower = pathway.toLowerCase();
        if (pathwayLower.includes('web')) return 'pathway-web';
        if (pathwayLower.includes('data')) return 'pathway-data';
        if (pathwayLower.includes('software')) return 'pathway-software';
        if (pathwayLower.includes('php')) return 'pathway-php';
        return 'pathway-default';
    },

    /**
     * Update statistics on the page
     */
    updateStatistics() {
        // Update job count
        const jobCountEl = document.getElementById('jobCount');
        if (jobCountEl) {
            jobCountEl.textContent = this.filteredRows.length;
        }

        // Calculate and update pay range
        const salaryIndex = this.allHeaders.indexOf('Salary Range');
        if (salaryIndex !== -1) {
            const salaries = this.filteredRows.map(row => {
                const salaryStr = row[salaryIndex] || '';
                const match = salaryStr.match(/[\d,]+\.?\d*/);
                return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
            }).filter(sal => sal > 0);

            if (salaries.length > 0) {
                const minSalary = Math.min(...salaries);
                const maxSalary = Math.max(...salaries);
                const payRangeEl = document.getElementById('payRange');
                if (payRangeEl) {
                    payRangeEl.textContent = `$${minSalary.toLocaleString()} - $${maxSalary.toLocaleString()}`;
                }
            }
        }

        // Update top skills
        const languageIndex = this.allHeaders.indexOf('Language');
        if (languageIndex !== -1) {
            const languages = {};
            this.filteredRows.forEach(row => {
                const lang = row[languageIndex];
                if (lang) {
                    languages[lang] = (languages[lang] || 0) + 1;
                }
            });

            const topSkillsEl = document.getElementById('topSkills');
            if (topSkillsEl) {
                const skillsText = Object.entries(languages)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([lang, count]) => `${lang} (${count})`)
                    .join(', ');
                topSkillsEl.textContent = skillsText || 'Various';
            }
        }
    },

    /**
     * Setup filters and search functionality
     */
    setupFiltersAndSearch() {
        // Add event listeners for search and filters
        const searchInput = document.getElementById('searchInput');
        const pathwayFilter = document.getElementById('pathwayFilter');
        const locationFilter = document.getElementById('locationFilter');
        const payRangeFilter = document.getElementById('payRangeFilter');
        const skillsFilter = document.getElementById('skillsFilter');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        [pathwayFilter, locationFilter, payRangeFilter, skillsFilter].forEach(filter => {
            if (filter) {
                filter.addEventListener('change', () => this.applyFilters());
            }
        });
    },

    /**
     * Apply all active filters and search
     */
    applyFilters() {
        const searchInput = document.getElementById('searchInput');
        const pathwayFilter = document.getElementById('pathwayFilter');
        const locationFilter = document.getElementById('locationFilter');
        const payRangeFilter = document.getElementById('payRangeFilter');
        const skillsFilter = document.getElementById('skillsFilter');

        // Start with all active rows
        this.filteredRows = [...this.allRows];

        // Apply search filter
        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase();
            this.filteredRows = this.filteredRows.filter(row => {
                return row.some(cell =>
                    cell.toString().toLowerCase().includes(searchTerm)
                );
            });
        }

        // Apply pathway filter
        if (pathwayFilter && pathwayFilter.value) {
            const pathwayIndex = this.allHeaders.indexOf('Pathway');
            if (pathwayIndex !== -1) {
                this.filteredRows = this.filteredRows.filter(row =>
                    row[pathwayIndex].toLowerCase().includes(pathwayFilter.value.toLowerCase())
                );
            }
        }

        // Apply location filter
        if (locationFilter && locationFilter.value) {
            const locationIndex = this.allHeaders.indexOf('Location');
            if (locationIndex !== -1) {
                this.filteredRows = this.filteredRows.filter(row =>
                    row[locationIndex].toLowerCase().includes(locationFilter.value.toLowerCase())
                );
            }
        }

        // Apply skills filter
        if (skillsFilter && skillsFilter.value) {
            const languageIndex = this.allHeaders.indexOf('Language');
            if (languageIndex !== -1) {
                this.filteredRows = this.filteredRows.filter(row =>
                    row[languageIndex].toLowerCase().includes(skillsFilter.value.toLowerCase())
                );
            }
        }

        // Apply pay range filter
        if (payRangeFilter && payRangeFilter.value) {
            const salaryIndex = this.allHeaders.indexOf('Salary Range');
            if (salaryIndex !== -1) {
                const [min, max] = payRangeFilter.value.split('-').map(v => parseInt(v) || 0);
                this.filteredRows = this.filteredRows.filter(row => {
                    const salaryStr = row[salaryIndex] || '';
                    const match = salaryStr.match(/[\d,]+\.?\d*/);
                    const salary = match ? parseFloat(match[0].replace(/,/g, '')) : 0;

                    if (payRangeFilter.value.includes('+')) {
                        return salary >= min;
                    } else if (max) {
                        return salary >= min && salary <= max;
                    }
                    return true;
                });
            }
        }

        // Refresh display
        this.displayJobListings();
        this.updateStatistics();

        console.log(`Filters applied. Showing ${this.filteredRows.length} jobs.`);
    },

    /**
     * Show loading state in the table
     */
    showLoadingState() {
        const table = document.getElementById('jobTable');
        if (!table) return;

        const thead = table.querySelector('thead') || table.createTHead();
        const tbody = table.querySelector('tbody') || table.createTBody();

        // Clear header while loading (optional)
        thead.innerHTML = '';

        // Show a single-row loading message in the body
        tbody.innerHTML = `
    <tr>
      <td colspan="9" style="text-align: center; padding: 20px;">
        <i class="fa-solid fa-spinner fa-spin"></i> Loading job listings...
      </td>
    </tr>
  `;
    }
    ,

    /**
     * Show error message if data loading fails
     */
    showErrorMessage() {
        const table = document.getElementById('jobTable');
        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px;">
                        <h3 style="color: var(--d-magenta);">Unable to load job listings</h3>
                        <p>Please try refreshing the page or contact support if the problem persists.</p>
                        <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: var(--b-blue); color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Refresh Page
                        </button>
                    </td>
                </tr>
            `;
        }
    },

    /**
     * Manual refresh function (can be called from console or button)
     */
    async refreshData() {
        console.log('Manually refreshing job data...');
        this.clearCache();
        await this.initListingsPage();
    }
};

// Auto-initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;

    if (currentPage === '/' || currentPage.includes('index.html')) {
        // On homepage - preload data in background
        JobDataManager.initHomePage();
    } else if (currentPage.includes('listings.html')) {
        // On listings page - display data
        JobDataManager.initListingsPage();
    }
});

// Export for console debugging (optional)
if (typeof window !== 'undefined') {
    window.JobDataManager = JobDataManager;
}