const JobTable = {
    JOBS_PER_PAGE: 15,
    currentPage: 1,
    totalPages: 1,

    render(headers, rows, page = 1) {
        const table = document.getElementById('jobTable');
        if (!table) return "Table not found!";

        // Pagination: calculate num pages
        this.totalPages = Math.ceil(rows.length / this.JOBS_PER_PAGE);

        const thead = table.querySelector('thead') || table.createTHead();
        const tbody = table.querySelector('tbody') || table.createTBody();

        thead.innerHTML = '';
        tbody.innerHTML = '';

        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            if (header !== 'Deactivate?') {
                const th = document.createElement('th');
                th.textContent = header;
                headerRow.appendChild(th);
            }
        });
        thead.appendChild(headerRow);

        /** Creates a new array containing only
         * the first 15 rows from the rows array
         */
        const rowsToDisplay = rows.slice(0, this.JOBS_PER_PAGE);
        rowsToDisplay.forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach((header, index) => {
                if (header !== 'Deactivate?') {
                    const td = document.createElement('td');
                    this.formatCell(td, header, row[index] || '');
                    tr.appendChild(td);
                }
            });
            tbody.appendChild(tr);
        });

        console.log(`Displayed ${rowsToDisplay.length} of ${rows.length} total jobs`);
    },

    formatCell(td, header, value) {
        switch (header) {
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
        if (pathwayLower.includes('python')) return 'pathway-python';
        if (pathwayLower.includes('c#')) return 'pathway-c#';
        if (pathwayLower.includes('javascript')) return 'pathway-javascript';
        if (pathwayLower.includes('php')) return 'pathway-php';
        return 'pathway-default';
    },

    showLoading() {
        const table = document.getElementById('jobTable');
        if (!table) return;
        
        const tbody = table.querySelector('tbody') || table.createTBody();
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 20px;">
                    <i class="fa-solid fa-spinner fa-spin"></i> Loading job listings...
                </td>
            </tr>
        `;
    },

    showError() {
        const table = document.getElementById('jobTable');
        if (!table) return;
        
        table.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px;">
                    <h3 style="color: var(--d-magenta);">Unable to load job listings</h3>
                    <p>Please try refreshing the page</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: var(--b-blue); color: white; border: none; border-radius: 5px; cursor: pointer;">
                        Refresh Page
                    </button>
                </td>
            </tr>
        `;
    }
};