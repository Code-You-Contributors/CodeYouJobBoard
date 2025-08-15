const JobTable = {
    JOBS_PER_PAGE: 15,
    currentPage: 1,
    totalPages: 1,

    render(headers, rows, page = 1) {
        const table = document.getElementById('jobTable');
        if (!table) return "Table not found!";

        // Pagination: calculate num pages
        this.totalPages = Math.ceil(rows.length / this.JOBS_PER_PAGE);
        this.currentPage = Math.min(page, this.totalPages);
        this.currentPage = Math.max(1, this.currentPage);

        // Dynamic buttons: Crafting a range, with a beginning / end index
        const startIndex = (this.currentPage - 1) * this.JOBS_PER_PAGE;
        const endIndex = startIndex + this.JOBS_PER_PAGE;
        const rowsToDisplay = rows.slice(startIndex, endIndex);

        // Table rendering for the data
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

        // Render the pagination controls:
        this.renderPagination(rows.length);

        console.log(`Displayed ${rowsToDisplay.length} of ${rows.length} total jobs`);
    },

    renderPagination(totalRows) {
        let paginationContainer = document.getElementById('paginationControls');

        if (!paginationContainer) {
            const tableContainer = document.querySelector('.table-container');
            if (!tableContainer) return;

            paginationContainer = document.createElement('div');
            paginationContainer.id = 'paginationControls';
            paginationContainer.className = 'pagination-controls';
            tableContainer.appendChild(paginationContainer);
        }

        paginationContainer.innerHTML = '';

        if (this.totalPages <= 1) return;

        const backBtn = document.createElement('button');
        backBtn.className = 'pagination-btn pagination-nav';
        backBtn.disabled = this.currentPage === 1;

        // Back Buttons
        const backIcon = document.createElement('i');
        backIcon.className = 'fa-solid fa-chevron-left';
        backBtn.appendChild(backIcon);
        backBtn.appendChild(document.createTextNode(' Back'));

        backBtn.onclick = () => JobController.goToPage(this.currentPage - 1);
        paginationContainer.appendChild(backBtn);

        // Page number buttons
        const pageButtonsContainer = document.createElement('div');
        pageButtonsContainer.className = 'pagination-numbers';

        for (let i = 1; i <= this.totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = 'pagination-btn pagination-number';
            pageBtn.appendChild(document.createTextNode(i.toString()));

            if (i === this.currentPage) {
                pageBtn.classList.add('active');
            }

            pageBtn.onclick = () => JobController.goToPage(i);
            pageButtonsContainer.appendChild(pageBtn);
        }

        paginationContainer.appendChild(pageButtonsContainer);

        // Next button (next page)
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn pagination-nav';
        nextBtn.disabled = this.currentPage === this.totalPages;

        nextBtn.appendChild(document.createTextNode('Next '));
        const nextIcon = document.createElement('i');
        nextIcon.className = 'fa-solid fa-chevron-right';
        nextBtn.appendChild(nextIcon);

        nextBtn.onclick = () => JobController.goToPage(this.currentPage + 1);
        paginationContainer.appendChild(nextBtn);

        // Page info (which page you're on / can click/skip to...)
        const pageInfo = document.createElement('span');
        pageInfo.className = 'pagination-info';
        pageInfo.appendChild(
            document.createTextNode(`Page ${this.currentPage} of ${this.totalPages} (${totalRows} total jobs)`)
        );
        paginationContainer.appendChild(pageInfo);
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