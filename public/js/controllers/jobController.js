const JobController = {
    allHeaders: [],
    allRows: [],
    filteredRows: [],

    async init() {
        const currentPage = window.location.pathname;
        
        if (currentPage === '/' || currentPage.includes('index.html')) {
            await this.initHomePage();
        } else if (currentPage.includes('listings.html')) {
            await this.initListingsPage();
        }
    },

    async initListingsPage() {
        JobTable.showLoading();
        
        let data = CacheManager.get();
        if (!data) {
            data = await JobAPI.fetchJobData();
            if (data) {
                CacheManager.store(data);
            }
        }

        if (data) {
            this.processData(data);
            this.setupEventListeners();
        } else {
            JobTable.showError();
        }
    },

    processData(data) {
        const processed = DataParser.extractHeadersAndData(data);
        this.allHeaders = processed.headers;
        this.allRows = DataParser.filterDeactivated(processed.rows, this.allHeaders);
        this.filteredRows = [...this.allRows];
        
        JobTable.render(this.allHeaders, this.filteredRows);
        Statistics.update(this.filteredRows, this.allHeaders);
    },

    applyFilters() {
        let rows = [...this.allRows];
        
        const searchInput = document.getElementById('searchInput');
        const pathwayFilter = document.getElementById('pathwayFilter');
        const locationFilter = document.getElementById('locationFilter');
        const skillsFilter = document.getElementById('skillsFilter');
        const payRangeFilter = document.getElementById('payRangeFilter');

        if (searchInput?.value) {
            rows = JobFilters.filterBySearch(rows, searchInput.value, this.allHeaders);
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
        JobTable.render(this.allHeaders, this.filteredRows);
        Statistics.update(this.filteredRows, this.allHeaders);
    },

    setupEventListeners() {
        ['searchInput', 'pathwayFilter', 'locationFilter', 'skillsFilter', 'payRangeFilter']
            .forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener(id === 'searchInput' ? 'input' : 'change', 
                        () => this.applyFilters()
                    );
                }
            });
    }
};