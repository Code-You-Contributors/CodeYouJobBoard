const JobController = {
    allHeaders: [],
    allRows: [],
    filteredRows: [],
    currentPage: 1,

    async init() {
        const currentPage = window.location.pathname;
        
        if (currentPage === '/' || currentPage.includes('index.html')) {
            await this.initHomePage();
            // Use 'else if', not 'else' here, since we want to only run `listings` 
            // when the path actually targets `listings.html`.
        } else if (currentPage.includes('listings.html')) {
            await this.initListingsPage();
        }
    },

    async initHomePage() {
        console.log('Homepage: Preloading job data in background...');
        const cachedData = CacheManager.get();
        if (cachedData) {
            console.log('Valid cache found, skipping fetch');
            this.updateHomepageBadge(cachedData);
            return;
        }
        const data = await JobAPI.fetchJobData();
        if (data) {
            CacheManager.store(data);
            this.updateHomepageBadge(data);
        }
    },

    updateHomepageBadge(data) {
        try {
            const processedData = DataParser.extractHeadersAndData(data);
            const activeRows = DataParser.filterDeactivated(processedData.rows, processedData.headers);
            Statistics.updateHomepageBadge(activeRows.length);
        } catch (error) {
            console.error('Error updating homepage badge:', error);
        }
    },

    async initListingsPage() {
        console.log('Listings page: Loading job data...');
        JobTable.showLoading();
        
        let data = CacheManager.get();
        if (!data) {
            console.log('No cached data found, fetching fresh data...');
            data = await JobAPI.fetchJobData();
            if (data) {
                CacheManager.store(data);
            }
        }

        if (data) {
            this.processAndDisplayData(data);
        } else {
            JobTable.showError();
        }
    },

    processAndDisplayData(data) {
        const processedData = DataParser.extractHeadersAndData(data);
        this.allHeaders = processedData.headers;
        this.allRows = DataParser.filterDeactivated(processedData.rows, this.allHeaders);
        
        console.log(`Filtered out deactivated jobs. Active jobs: ${this.allRows.length}`);
        
        this.filteredRows = [...this.allRows];
        this.currentPage = 1;
        
        JobTable.render(this.allHeaders, this.filteredRows, this.currentPage);
        Statistics.update(this.filteredRows, this.allHeaders);
        this.setupFiltersAndSearch();
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

        let rows = [...this.allRows];

        if (searchInput?.value?.trim()) {
            rows = JobFilters.filterBySearch(rows, searchInput.value);
        }

        if (pathwayFilter?.value) {
            rows = JobFilters.filterByPathway(rows, pathwayFilter.value, this.allHeaders);
        }

        if (locationFilter?.value) {
            rows = JobFilters.filterByLocation(rows, locationFilter.value, this.allHeaders);
        }

        if (skillsFilter?.value) {
            rows = JobFilters.filterBySkills(rows, skillsFilter.value, this.allHeaders);
        }

        if (payRangeFilter?.value) {
            rows = JobFilters.filterBySalaryRange(rows, payRangeFilter.value, this.allHeaders);
        }

        this.filteredRows = rows;
        this.currentPage = 1; // Reset to page 1 when filters change
        
        JobTable.render(this.allHeaders, this.filteredRows, this.currentPage);
        Statistics.update(this.filteredRows, this.allHeaders);
        console.log(`Filters applied. Showing ${this.filteredRows.length} jobs.`);
    },

    goToPage(page) {
        this.currentPage = page;
        JobTable.render(this.allHeaders, this.filteredRows, this.currentPage);
        
        // Scroll to top of table
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    async refreshData() {
        console.log('Manually refreshing job data...');
        CacheManager.clear();
        await this.initListingsPage();
    }
};