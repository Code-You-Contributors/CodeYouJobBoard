// Handles fetching, caching, displaying, and filtering job data

const JobDataManager = {
    // Config handlers
    STORAGE_KEY: 'codeyou_job_data',
    TIMESTAMP_KEY: 'codeyou_job_data_timestamp',
    // 5 minutes in milliseconds
    CACHE_DURATION: 0.5 * 60 * 1000,
    // Number of jobs to display per page
    JOBS_PER_PAGE: 600,
    // Auto-hide dates that are >= 30 days old
    AUTO_DEACTIVATE_DAYS: 30,

    // Data storage
    fullData: null,
    allHeaders: [],
    allRows: [],
    filteredRows: [],

    // Normalize TRUE/FALSE from the sheet (handles strings, booleans, whitespace)
    isTrue(val) {
        if (val === true) return true;
        if (typeof val === 'string') {
            const s = val.trim().toLowerCase();
            return s === 'true' || s === 'yes' || s === '1';
        }
        return false;
    },

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
            return this.fetchFallbackData();
        }
    },

    // async fetchFallbackData() {
    //     try {
    //         console.log('Attempting to load fallback data from data.json...');
    //         const response = await fetch('./data.json');
    //         const fallbackData = await response.json();

    //         if (fallbackData.headers && fallbackData.values) {
    //             console.log('Successfully loaded fallback data');
    //             const transformedValues = fallbackData.values.map((col, index) => {
    //                 return [fallbackData.headers[index], ...col];
    //             });
    //             return {
    //                 range: fallbackData.range || "JobBoard!A:I",
    //                 majorDimension: fallbackData.majorDimension || "COLUMNS",
    //                 values: transformedValues
    //             };
    //         }
    //         return fallbackData;
    //     } catch (error) {
    //         console.error('Failed to load fallback data:', error);
    //         return null;
    //     }
    // },

    storeJobData(data) {
        try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            sessionStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
            console.log('Job data cached successfully');
        } catch (error) {
            console.error('Error storing job data in sessionStorage:', error);
        }
    },

    getCachedJobData() {
        try {
            const timestamp = sessionStorage.getItem(this.TIMESTAMP_KEY);
            const data = sessionStorage.getItem(this.STORAGE_KEY);

            if (!timestamp || !data) {
                return null;
            }

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

    clearCache() {
        sessionStorage.removeItem(this.STORAGE_KEY);
        sessionStorage.removeItem(this.TIMESTAMP_KEY);
        console.log('Cache cleared');
    },

    extractHeadersAndData(data) {
        const values = data.values || [];
        const majorDimension = (data.majorDimension || 'ROWS').toUpperCase();

        if (majorDimension === 'COLUMNS') {
            const headers = values.map(col => col[0] || '');
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
            const headers = values[0] || [];
            const rows = values.slice(1);
            return { headers, rows };
        }
    },

    parseUSDate(dateStr) {
        if (!dateStr) return null;
        let d = new Date(dateStr);
        if (!isNaN(d)) {
            d.setHours(0, 0, 0, 0);
            return d;
        }
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

    async initHomePage() {
        console.log('Homepage: Preloading job data in background...');
        const cachedData = this.getCachedJobData();
        if (cachedData) {
            console.log('Valid cache found, skipping fetch');
            this.updateHomepageBadge(cachedData);
            return;
        }
        const data = await this.fetchJobData();
        if (data) {
            this.storeJobData(data);
            this.updateHomepageBadge(data);
        }
    },

    updateHomepageBadge(data) {
        try {
            const processedData = this.extractHeadersAndData(data);
            const deactivateIndex = processedData.headers.indexOf('Deactivate?');

            let activeJobs = processedData.rows;
            if (deactivateIndex !== -1) {
                activeJobs = activeJobs.filter(row => !this.isTrue(row[deactivateIndex]));
            }

            const jobCount = activeJobs.length;

            const jobLink = document.querySelector('a[href="/listings.html"]');
            if (jobLink && jobCount >= 0) {
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

    async initListingsPage() {
        console.log('Listings page: Loading job data...');
        this.showLoadingState();
        let data = this.getCachedJobData();
        if (!data) {
            console.log('No cached data found, fetching fresh data...');
            data = await this.fetchJobData();
            if (data) {
                this.storeJobData(data);
            }
        }
        if (data) {
            this.processAndDisplayData(data);
        } else {
            this.showErrorMessage();
        }
    },

    processAndDisplayData(data) {
        this.fullData = data;
        const processedData = this.extractHeadersAndData(data);
        this.allHeaders = processedData.headers;
        this.allRows = processedData.rows;

        // Filter out deactivated jobs based on sheet
        const deactivateIndex = this.allHeaders.indexOf('Deactivate?');
        if (deactivateIndex !== -1) {
            this.allRows = this.allRows.filter(row => !this.isTrue(row[deactivateIndex]));
            console.log(`Filtered out deactivated jobs. Active jobs: ${this.allRows.length}`);
        }

        this.filteredRows = [...this.allRows];

        this.displayJobListings();
        this.updateStatistics();
        this.setupFiltersAndSearch();
    },

    displayJobListings() {
        const table = document.getElementById('jobTable');
        if (!table) return;

        const thead = table.querySelector('thead') || table.createTHead();
        const tbody = table.querySelector('tbody') || table.createTBody();

        thead.innerHTML = '';
        tbody.innerHTML = '';

        const rowsToDisplay = this.filteredRows.slice(0, this.JOBS_PER_PAGE);

        const headerRow = document.createElement('tr');
        this.allHeaders.forEach(header => {
            if (header !== 'Deactivate?') {
                const th = document.createElement('th');
                th.textContent = header;
                headerRow.appendChild(th);
            }
        });
        thead.appendChild(headerRow);

        rowsToDisplay.forEach(row => {
            const tr = document.createElement('tr');
            this.allHeaders.forEach((header, index) => {
                if (header !== 'Deactivate?') {
                    const td = document.createElement('td');
                    const cellValue = row[index] || '';
                    this.formatTableCell(td, header, cellValue);
                    tr.appendChild(td);
                }
            });
            tbody.appendChild(tr);
        });

        console.log(`Displayed ${rowsToDisplay.length} of ${this.filteredRows.length} total active jobs`);
    },

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

    getPathwayClass(pathway) {
        const pathwayLower = pathway.toLowerCase();
        if (pathwayLower.includes('web')) return 'pathway-web';
        if (pathwayLower.includes('data')) return 'pathway-data';
        if (pathwayLower.includes('software')) return 'pathway-software';
        if (pathwayLower.includes('php')) return 'pathway-php';
        return 'pathway-default';
    },

    updateStatistics() {
        const jobCountEl = document.getElementById('jobCount');
        if (jobCountEl) {
            jobCountEl.textContent = this.filteredRows.length;
        }

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

    setupFiltersAndSearch() {
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

    applyFilters() {
        const searchInput = document.getElementById('searchInput');
        const pathwayFilter = document.getElementById('pathwayFilter');
        const locationFilter = document.getElementById('locationFilter');
        const payRangeFilter = document.getElementById('payRangeFilter');
        const skillsFilter = document.getElementById('skillsFilter');

        this.filteredRows = [...this.allRows];

        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase();
            this.filteredRows = this.filteredRows.filter(row => {
                return row.some(cell =>
                    cell.toString().toLowerCase().includes(searchTerm)
                );
            });
        }

        if (pathwayFilter && pathwayFilter.value) {
            const pathwayIndex = this.allHeaders.indexOf('Pathway');
            if (pathwayIndex !== -1) {
                this.filteredRows = this.filteredRows.filter(row =>
                    row[pathwayIndex].toLowerCase().includes(pathwayFilter.value.toLowerCase())
                );
            }
        }

        if (locationFilter && locationFilter.value) {
            const locationIndex = this.allHeaders.indexOf('Location');
            if (locationIndex !== -1) {
                this.filteredRows = this.filteredRows.filter(row =>
                    row[locationIndex].toLowerCase().includes(locationFilter.value.toLowerCase())
                );
            }
        }

        if (skillsFilter && skillsFilter.value) {
            const languageIndex = this.allHeaders.indexOf('Language');
            if (languageIndex !== -1) {
                this.filteredRows = this.filteredRows.filter(row =>
                    row[languageIndex].toLowerCase().includes(skillsFilter.value.toLowerCase())
                );
            }
        }

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

        this.displayJobListings();
        this.updateStatistics();
        console.log(`Filters applied. Showing ${this.filteredRows.length} jobs.`);
    },

    showLoadingState() {
        const table = document.getElementById('jobTable');
        if (!table) return;
        const thead = table.querySelector('thead') || table.createTHead();
        const tbody = table.querySelector('tbody') || table.createTBody();
        thead.innerHTML = '';
        tbody.innerHTML = `
    <tr>
      <td colspan="9" style="text-align: center; padding: 20px;">
        <i class="fa-solid fa-spinner fa-spin"></i> Loading job listings...
      </td>
    </tr>
  `;
    },

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

    async refreshData() {
        console.log('Manually refreshing job data...');
        this.clearCache();
        await this.initListingsPage();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;

    if (currentPage === '/' || currentPage.includes('index.html')) {
        JobDataManager.initHomePage();
    } else if (currentPage.includes('listings.html')) {
        JobDataManager.initListingsPage();
    }
});

if (typeof window !== 'undefined') {
    window.JobDataManager = JobDataManager;
}