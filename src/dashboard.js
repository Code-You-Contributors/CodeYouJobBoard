// dashboard.html
/**
 * @fileoverview Dashboard helpers and rendering logic for the CodeYou job dashboard.
 * Contains data parsing, filtering, pagination, table rendering and Chart.js integration.
 *
 */

/**
 * A Job object parsed from the CSV. Properties are derived from the CSV headers.
 *
 *  - Date (string in MM/DD/YYYY)
 *  - Employer (string)
 *  - Job Title (string)
 *  - Pathway (string)
 *  - Language (string|Array<string>)
 *  - Salary Range (string)
 *  - Contact Person (string)
 *  - Location (string)
 *  - Apply (string URL)
 *  - Deactivate? (boolean)
 *
 *
 */

// Array of active job objects (populated during initialLoad after parsing)
let allActiveJobs = [];

// Array of table header strings read from the first CSV row
let tableHeaders = [];

// Storage for chart instances (Chart.js) keyed by chart id like 'pie','donut','bar'.
// Store Chart.js instances for destroy/recreate
let charts = {}; 

// Pagination state
let dashPerPage = 10;
let dashCurrentPage = 1;
let dashTotalPages = 0;

// Table sorting state
let dashSortColumn = null; // e.g., 'Date' or 'Job Title'
let dashSortDirection = 'asc';

// Percentage threshold below which labels will be hidden to avoid overlap
const LABEL_THRESHOLD_PCT = 1; // percent

// Pagination and table helpers (dashboard-specific; inlined to avoid shared file)
// Returns the slice for the requested page and total pages.
function paginate(items, currentPage = 1, perPage = 10) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  return { items: items.slice(start, end), totalPages };
}

// Generate pagination range with adaptive neighboring pages and ellipses
// Build a compact pagination range. Inserts "…" tokens when there are gaps.
// This produces arrays like [1, '…', 4,5,6, '…', 20] depending on viewport.
function getPaginationRange(current, total) {
  const viewportWidth = window.outerWidth || window.innerWidth || 1024;
  const numNeighboringPages = viewportWidth <= 550 ? 0 : 2;
  const range = [];
  const rangeWithDots = [];

  for (let i = 1; i <= total; i++) {
    if (
      i === 1 ||
      i === total ||
      (i >= current - numNeighboringPages && i <= current + numNeighboringPages)
    ) {
      range.push(i);
    }
  }

  // Convert numeric range into a list containing numbers and ellipsis tokens
  let last = null;
  for (let i of range) {
    if (last) {
      if (i - last === 2) {
         // If the gap is exactly one page, show that intervening page
        rangeWithDots.push(last + 1);
      } else if (i - last > 2) {
        rangeWithDots.push("…");
      }
    }
    rangeWithDots.push(i);
    last = i;
  }

  return rangeWithDots;
}

// Format a number as US dollars with no decimals. Returns 'Not Provided' for invalid inputs.
function formatDollar(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Not Provided';
  return (
    '$' +
    amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

// Renders pagination buttons into the element with id=containerId.
// onPageChange is called with the new page number.
function renderPaginationControls(containerId, totalPages, currentPage, onPageChange) {
  const controlsElement = document.getElementById(containerId);
  if (!controlsElement) return;
  controlsElement.innerHTML = '';
  if (totalPages <= 1) return;

  // Prev button
  if (currentPage !== 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '◀ Prev';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => onPageChange(currentPage - 1);
    controlsElement.appendChild(prevBtn);
  }

  // Page number buttons + ellipses
  const pageRange = getPaginationRange(currentPage, totalPages);
  pageRange.forEach((p) => {
    if (p === '…') {
      // Ellipsis button prompts for a specific page number when clicked
      const ellipsisBtn = document.createElement('button');
      ellipsisBtn.textContent = '…';
      ellipsisBtn.onclick = () => {
        const input = prompt('Enter page number:');
        let targetPage = parseInt(input, 10);
        if (isNaN(targetPage) || targetPage < 1) targetPage = currentPage;
        if (targetPage > totalPages) targetPage = totalPages;
        onPageChange(targetPage);
      };
      controlsElement.appendChild(ellipsisBtn);
    } else {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = p;
      if (p === currentPage) pageBtn.disabled = true;
      pageBtn.onclick = () => onPageChange(p);
      controlsElement.appendChild(pageBtn);
    }
  });

  // Next button
  if (currentPage !== totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next ▶';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => onPageChange(currentPage + 1);
    controlsElement.appendChild(nextBtn);
  }
}

// Map various location strings to short display labels the user requested.
// Convert verbose or free-form location strings into short labels used on the UI/charts.
// This improves readability on labels (e.g., "Northern KY" -> "NKY", "Louisville" stays "Louisville").
function getShortLocationLabel(fullLabel) {
  if (!fullLabel) return '';
  const s = String(fullLabel).toLowerCase();

  // Exact or partial matches
  if (s.includes('northern') || s.includes('nky') || s.includes('north')) return 'NKY';
  if (s.includes('eastern') || s.includes('eky') || s.includes('east')) return 'EKY';
  if (s.includes('central') || s.includes('cky') || s.includes('center') || s.includes('centre')) return 'CKY';
  if (s.includes('indiana')) return 'S. Indiana';
  if (s.includes('louisville') || s.includes('lou')) return 'Louisville';
  if (s.includes('remote')) return 'Remote';

  // Fallback: try to return a short token (first two words)
  const parts = String(fullLabel).split(/\s+/).slice(0, 2);
  return parts.join(' ');
}

// Exact copy from jobBoard.js for parse/create
// Fetch CSV/text data from a URL and return as text.
// At runtime this fetches the published Google Sheet CSV (sheetUrl variable below).
async function fetchJobData(url) {
  let result;

  const response = await fetch(url);
  result = await response.text();

  return result;
}

// Parse CSV into rows and headers. Uses parseCSVLine to handle quoted fields.
// Returns an object { tableHeaders: string[], jobs: string[][] } where jobs are raw cell arrays.
function parseJobData(data) {
  let result = {};

  const jobData = data
    .trim()
    .split(/\r?\n/)
    .map(parseCSVLine)
    .filter((row) => row.length)
    .map((row) => row.filter((cell) => cell !== "")) // remove empty empty-cell items
    .filter((row) => row.length >= 9) // guard: need at least 9 columns (sheet expectation)
    .map(replaceUnderscoresInRow); // replace underscores with spaces

  result.tableHeaders = [...jobData[0]];
  result.jobs = [...jobData.slice(1)];

  return result;
}

/// Parse a single CSV line into an array of cell strings, handling quoted commas.
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Toggle inQuotes flag when encountering a quote
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Replace underscores with spaces in each cell of a row
function replaceUnderscoresInRow(row) {
  return row.map(cell => cell.replace(/_/g, ' '));
}

// Toggle a value in a <select> element (multi-select). If the value is already the
// only selected option, this resets selection to 'All'.
function toggleSelectValue(selectId, value) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const opts = Array.from(select.options);
  const values = opts.filter(o => o.selected).map(o => o.value);
  // Single-select behavior: if clicked value is already the only selection, reset to 'All'
  if (values.length === 1 && values[0] === value) {
    opts.forEach(o => o.selected = (o.value === 'All'));
    return;
  }

  // Otherwise select only the clicked value
  opts.forEach(o => { o.selected = (o.value === value); });
}

// Create normalized job objects from header keys and raw CSV rows.
// This function:
//  - trims cells/keys
//  - parses Date strings into Date objects
//  - converts 'Deactivate?' to boolean-like value
//  - parses Salary into an object {min,max,avg}
//  - splits Language into an array
// It returns an array of job objects keyed by the original CSV header strings.
function createJobs(keys, jobData) {
  const result = [];

  jobData.forEach((job, rowIndex) => {  // Added rowIndex for logging
    const parsedJob = {};
    
    // Guard: some rows may be malformed; skip those
    if (job.length < keys.length) {
      console.warn(`Skipping malformed row ${rowIndex + 2}: Expected ${keys.length} columns, got ${job.length}`, job);  // +2 assumes header + 1-based
      return;
    }

    keys.forEach((key, index) => {
      const cellValue = job[index];  // Raw cell
      if (cellValue === undefined || cellValue === null) {
        // Default to empty string for missing cells
        parsedJob[key] = '';
        console.warn(`Empty cell at row ${rowIndex + 2}, col ${index} (${key})`);
        return;
      }

      const trimmedKey = key.trim();
      const trimmedCell = String(cellValue).trim();  // Safe trim
      // Field-specific normalization rules
      if (trimmedKey.toLowerCase() === "date") {
        // store as Date object or null
        parsedJob[key] = parseDate(trimmedCell);
      } else if (trimmedKey.toLowerCase() === "deactivate?") {
        // convert to boolean-like: any value other than "false" (case-insensitive) becomes true
        parsedJob[key] = trimmedCell.toLowerCase() !== "false";
      } else if (trimmedKey.toLowerCase().includes("salary")) {
        // parse salary like "$70,000 - $90,000" into numeric min/max/avg
        const salaryRange = trimmedCell.replace(/[$,]/g, "").split("-");
        const min = parseFloat(salaryRange[0].trim()) || null;
        const max = salaryRange.length > 1 ? parseFloat(salaryRange[1].trim()) || null : null;
        const avg = (min + (max || min)) / 2;

        parsedJob[key] = { min, max, avg };
      } else if (trimmedKey.toLowerCase() === "language") {
        // languages are stored as array of trimmed strings
        parsedJob[key] = trimmedCell.split(",").map(lang => lang.trim()).filter(lang => lang);
      } else {
        // default: store trimmed string
        parsedJob[key] = trimmedCell;
      }
    });

    // Only add if we parsed at least one field (avoids empty objects)
    if (Object.keys(parsedJob).length > 0) {
      result.push(parsedJob);
    }
  });

  console.log(`Processed ${result.length} valid jobs from ${jobData.length} input rows`);
  return result;
}

// Filter out deactivated jobs
function getActiveJobs(allJobs) {
  return allJobs.filter((job) => !job["Deactivate?"]);
}
 
// Parse date in MM/DD/YYYY format to Date object. Returns null if invalid.
function parseDate(str) {
  const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[0-1])\/(\d{4})$/;
  const match = str.match(regex);
  if (!match) return null;

  const [, mm, dd, yyyy] = match;
  // Construct a YYYY-MM-DD string to pass into Date constructor consistently
  return new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`);
}

// // Populate the UI <select> controls for Language, Location and Salary based on data.
// Languages are collected from job['Language'] arrays; Locations are normalized and deduped.
function populateFilters() {
 // Unique languages from allActiveJobs
  const uniqueLangs = [...new Set(allActiveJobs.flatMap(job => job['Language'] || []))].sort();
  const langSelect = document.getElementById('languageSelect');
  langSelect.innerHTML = '';
  // Add an "All" option as the default
  const allLangOption = document.createElement('option');
  allLangOption.value = 'All';
  allLangOption.textContent = 'All';
  allLangOption.selected = true;
  langSelect.appendChild(allLangOption);
  uniqueLangs.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang;
    option.textContent = lang;
    // individual languages default to not selected; 'All' controls default
    langSelect.appendChild(option);
  });

  // Unique locations
  // Exclude any '-' or empty location entries and normalize Unknown
  const uniqueLocs = [...new Set(allActiveJobs
    .map(job => (job['Location'] || 'Unknown').trim())
    .filter(loc => loc !== '' && loc !== '-'))].sort();
  const locSelect = document.getElementById('locationSelect');
  locSelect.innerHTML = '';
  // Add an "All" option as the default for locations
  const allLocOption = document.createElement('option');
  allLocOption.value = 'All';
  allLocOption.textContent = 'All';
  allLocOption.selected = true;
  locSelect.appendChild(allLocOption);
  uniqueLocs.forEach(loc => {
    const option = document.createElement('option');
    option.value = loc;
    option.textContent = loc;
    locSelect.appendChild(option);
  });

  // Salary filter options are fixed buckets
  const salarySelect = document.getElementById('salarySelect');
  salarySelect.innerHTML = '';
  const salaryOptions = [
    { value: 'All', text: 'All' },
    { value: '<50k', text: '<50k' },
    { value: '50-75k', text: '50-75k' },
    { value: '75-100k', text: '75-100k' },
    { value: '>100k', text: '>100k' }
  ];
  salaryOptions.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.text;
    if (opt.value === 'All') o.selected = true;
    salarySelect.appendChild(o);
  });
}

// Clear all filters to default state (All selected)
function clearAllFilters() {
  const langSelect = document.getElementById('languageSelect');
  const locSelect = document.getElementById('locationSelect');
  // Select only the 'All' option for each select (if present), otherwise select none
  Array.from(langSelect.options).forEach(opt => opt.selected = (opt.value === 'All'));
  Array.from(locSelect.options).forEach(opt => opt.selected = (opt.value === 'All'));
  const salarySelect = document.getElementById('salarySelect');
  if (salarySelect) Array.from(salarySelect.options).forEach(opt => opt.selected = (opt.value === 'All'));
  updateFromFilters();
}

// Read UI filters, validate dates, apply filters to the in-memory job list, then update charts/table.
// - Validates both dates exist and From < To and range >= 2 days
// - Applies date, salary, language and location filters in sequence
function updateFromFilters() {
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const startDate = new Date(startDateInput.value);
  const endDate = new Date(endDateInput.value);
  const dateWarningEl = document.getElementById('dateWarning');

  // Basic validation: both dates must be valid
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    // Show warning if either date is missing
    if (dateWarningEl) {
      dateWarningEl.textContent = 'Please choose both From and To dates.';
      dateWarningEl.hidden = false;
    }
    return;
  }

  // From must be strictly before To, and the range must be at least 2 days
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayDiff = Math.round((endDate - startDate) / msPerDay);
  if (startDate >= endDate) {
    if (dateWarningEl) {
      dateWarningEl.textContent = 'The From date should be before the To date.';
      dateWarningEl.hidden = false;
    }
    return;
  }
  if (dayDiff < 2) {
    if (dateWarningEl) {
      dateWarningEl.textContent = 'Please select a range of at least 2 days.';
      dateWarningEl.hidden = false;
    }
    return;
  }

  // Dates valid -> hide any previous warning
  if (dateWarningEl) {
    dateWarningEl.textContent = '';
    dateWarningEl.hidden = true;
  }

  const dateFilteredJobs = allActiveJobs.filter(job => {
    const jobDate = job['Date'];
    return jobDate && jobDate >= startDate && jobDate <= endDate;
  });

  // Salary bucket filter
  // Salary filter: uses parsed salary.avg for comparisons. 'All' means no filter.
  const salarySelect = document.getElementById('salarySelect');
  const selectedSalary = salarySelect ? salarySelect.value : 'All';
  const salaryFilteredJobs = dateFilteredJobs.filter(job => {
    const salary = job['Salary Range']?.avg;
    if (!salary || selectedSalary === 'All') return true;
    if (selectedSalary === '<50k') return salary < 50000;
    if (selectedSalary === '50-75k') return salary >= 50000 && salary < 75000;
    if (selectedSalary === '75-100k') return salary >= 75000 && salary < 100000;
    if (selectedSalary === '>100k') return salary >= 100000;
    return true;
  });

  // Read selected languages and locations from the select controls.
  let selectedLanguages = Array.from(document.getElementById('languageSelect').selectedOptions).map(opt => opt.value);
  let selectedLocations = Array.from(document.getElementById('locationSelect').selectedOptions).map(opt => opt.value);

  // If 'All' is selected together with other options, treat it as not selected so specific selections apply
  if (selectedLanguages.includes('All') && selectedLanguages.length > 1) {
    selectedLanguages = selectedLanguages.filter(s => s !== 'All');
  }
  if (selectedLocations.includes('All') && selectedLocations.length > 1) {
    selectedLocations = selectedLocations.filter(s => s !== 'All');
  }

  let filteredJobs = salaryFilteredJobs;

  // Language filter: include jobs with at least one selected language
  // Language filter: job passes if it includes any selected language (or if 'All' is selected)
  filteredJobs = filteredJobs.filter(job => {
    const jobLanguages = job['Language'] || [];
    // If 'All' is selected, don't filter by language
    if (selectedLanguages.includes('All')) return true;
    return selectedLanguages.length === 0 || selectedLanguages.some(lang => jobLanguages.includes(lang));
  });

  // Location filter: include jobs in selected locations
  // Location filter: if 'All' selected, pass all; otherwise match selectedLocations
  filteredJobs = filteredJobs.filter(job => {
    const jobLocation = job['Location'] || 'Unknown';
    // If 'All' is selected, don't filter by location
    if (selectedLocations.includes('All')) return true;
    return selectedLocations.length === 0 || selectedLocations.includes(jobLocation);
  });

   // Update a small stats element with the count of filtered jobs
  document.getElementById('jobCount').textContent = `Number of jobs: ${filteredJobs.length}`;

  // Re-render charts and table
  renderCharts(filteredJobs);
  // Also render the jobs table below the charts
  if (typeof renderTable === 'function') {
    // Reset pagination to first page whenever filters change
    dashCurrentPage = 1;
    renderTable(filteredJobs);
  }
}

// Render the dashboard table. Takes a filtered array of job objects.
function renderTable(jobs) {
  const tableBody = document.getElementById('dashboardJobTableBody');
  const theadRow = document.getElementById('dashboardTableHeadRow');
  const statusEl = document.getElementById('dashboardJobStatus');
  if (!tableBody || !theadRow) return;

  // Clear existing content
  tableBody.innerHTML = '';
  theadRow.innerHTML = '';

  // Use tableHeaders (array of header strings) to build thead if needed
  const headers = tableHeaders && tableHeaders.length ? tableHeaders : ['Date','Employer','Job Title','Pathway','Language','Salary Range','Contact Person','Location','Apply'];
  // (Header row is rebuilt later for the dashboard-specific columns)

  if (!jobs || jobs.length === 0) {
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = 'No jobs match the selected filters.';
    }
    // clear header and body
    theadRow.innerHTML = '';
    tableBody.innerHTML = '';
  renderPaginationControls('dashboard-pagination', 0, 0, (p) => {});
    return;
  }

  if (statusEl) {
    statusEl.hidden = true;
    statusEl.textContent = '';
  }

  // Columns to display on dashboard table
  const columns = ['Job Title','Language','Salary Range','Location'];

  // Build header row for these columns and attach sort handlers
  theadRow.innerHTML = '';
  columns.forEach(c => {
    const th = document.createElement('th');
    th.textContent = c;
    th.classList.add('sortable-header');

    // Add sort indicator span
    // Sort indicator span appended to header
    const sortSpan = document.createElement('span');
    sortSpan.className = 'sort-indicator';
    sortSpan.textContent = '';
    th.appendChild(sortSpan);

    th.addEventListener('click', () => {
      // Toggle sorting state
      if (dashSortColumn === c) {
        dashSortDirection = (dashSortDirection === 'asc') ? 'desc' : 'asc';
      } else {
        dashSortColumn = c;
        dashSortDirection = 'asc';
      }
      // Reset to first page when sorting changes
      dashCurrentPage = 1;
      renderTable(jobs);
    });

    theadRow.appendChild(th);
  });

  // Sort jobs according to current sort state before pagination
  let jobsToRender = Array.isArray(jobs) ? [...jobs] : [];
  if (dashSortColumn) {
    jobsToRender.sort((a, b) => sortJobs(a, b, dashSortColumn, dashSortDirection));
  }

  // Paginate using local paginate
  const { items: pageItems, totalPages } = paginate(jobsToRender, dashCurrentPage, dashPerPage);
  dashTotalPages = totalPages;
  tableBody.innerHTML = '';

  // Render rows for the current page
  pageItems.forEach(job => {
    const tr = document.createElement('tr');
    // Job Title
    tr.appendChild(createTd(job['Job Title'] || ''));
    // Language
    tr.appendChild(createTd((job['Language'] || []).join(', ')));
    // Salary
    const sal = job['Salary Range'];
    const salText = sal ? (formatDollar(sal.min) + (sal.max ? (' - ' + formatDollar(sal.max)) : '')) : '';
    tr.appendChild(createTd(salText, ''));
    // Location
    tr.appendChild(createTd(job['Location'] || ''));
    tableBody.appendChild(tr);
  });

  // Render pagination controls. (will call renderTable again when page changes)
  renderPaginationControls('dashboard-pagination', dashTotalPages, dashCurrentPage, (p) => {
    dashCurrentPage = p;
    renderTable(jobs);
  });

  // Update header sort indicators after rendering
  Array.from(theadRow.querySelectorAll('th')).forEach(th => {
    const col = th.firstChild && th.firstChild.nodeType === Node.TEXT_NODE ? th.firstChild.textContent.trim() : th.textContent.trim();
    const indicator = th.querySelector('.sort-indicator');
    if (!indicator) return;
    if (dashSortColumn === col) {
      indicator.textContent = dashSortDirection === 'asc' ? ' ▲' : ' ▼';
    } else {
      indicator.textContent = '';
    }
  });

  // small helper for creating td
  function createTd(text, className) {
    const td = document.createElement('td');
    td.textContent = text != null ? text : '';
    if (className) td.className = className;
    return td;
  }
}

// Sorting helper for jobs table
// Comparator used for sorting job rows in renderTable.
// Handles Date, Salary Range (by avg) and Language (array)
function sortJobs(a, b, column, direction) {
  const dir = direction === 'asc' ? 1 : -1;
  const av = (a && a[column] != null) ? a[column] : '';
  const bv = (b && b[column] != null) ? b[column] : '';

  // If sorting Date column, compare Date objects
  if (column === 'Date') {
    const at = av instanceof Date ? av.getTime() : (new Date(av)).getTime();
    const bt = bv instanceof Date ? bv.getTime() : (new Date(bv)).getTime();
    return (isNaN(at) ? -1 : at) < (isNaN(bt) ? -1 : bt) ? -1 * dir : 1 * dir;
  }

  // If sorting Salary Range, use avg
  if (column === 'Salary Range') {
    const aVal = a['Salary Range']?.avg || 0;
    const bVal = b['Salary Range']?.avg || 0;
    return (aVal - bVal) * dir;
  }

  // For Language, join array to string
  if (column === 'Language') {
    const aStr = Array.isArray(av) ? av.join(', ') : String(av);
    const bStr = Array.isArray(bv) ? bv.join(', ') : String(bv);
    return aStr.localeCompare(bStr) * dir;
  }

  // Default string compare
  const aStr = (typeof av === 'string') ? av : String(av);
  const bStr = (typeof bv === 'string') ? bv : String(bv);
  return aStr.localeCompare(bStr, undefined, {numeric: true}) * dir;
}

// Initial load: fetch CSV, parse, create job objects, initialize filters and attach event handlers.
async function initialLoad(url) {
  try {
    const csvText = await fetchJobData(url);
    const jobData = parseJobData(csvText);
    const allJobs = createJobs(jobData.tableHeaders, jobData.jobs);
    allActiveJobs = getActiveJobs(allJobs);
    tableHeaders = jobData.tableHeaders;

    populateFilters();
    clearAllFilters(); // Initial render with all filters selected

    // Add event listeners for filter changes
    document.getElementById('languageSelect').addEventListener('change', updateFromFilters);
    document.getElementById('locationSelect').addEventListener('change', updateFromFilters);
  const salaryEl = document.getElementById('salarySelect');
  if (salaryEl) salaryEl.addEventListener('change', updateFromFilters);

    // Clear filters button
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
  } catch (error) {
    console.error("Error loading sheet:", error);
    document.getElementById('jobCount').textContent = "Error loading data";
  }
}

// Render charts (pie/donut/bar) using Chart.js based on the filtered jobs array.
// Existing charts are destroyed and recreated to avoid memory leaks/state issues.
function renderCharts(jobs) {
  // Destroy old charts
  Object.values(charts).forEach(chart => chart.destroy());

  if (jobs.length === 0) return;

  // Pie: Salary Breakdown by Location (proportions of total salary)
  const locationTotals = {};
  jobs.forEach(job => {
    const loc = job['Location'] || 'Unknown';
    if (!locationTotals[loc]) locationTotals[loc] = 0;
    locationTotals[loc] += job['Salary Range'].avg;
  });
  const grandTotal = Object.values(locationTotals).reduce((a, b) => a + b, 0);
  const pieData = Object.entries(locationTotals)
    .filter(([, total]) => total > 0)
    .map(([loc, total]) => ({
      label: loc,
      value: grandTotal > 0 ? (total / grandTotal) * 100 : 0
    }));
  // Measure pie label widths to ensure outside labels fit (avoid clipping)
  const pieCtx = document.getElementById('pieChart').getContext('2d');
  let pieSidePadding = 40;
  try {
    const measure = pieCtx;
    measure.save();
    const shortLabels = pieData.map(d => getShortLocationLabel(d.label));
    measure.font = 'bold 14px var(--font-body)';
    const labelWidths = shortLabels.map(l => measure.measureText(l).width || 0);
    measure.font = '12px var(--font-body)';
    const pctWidths = pieData.map(d => measure.measureText(d.value.toFixed(1) + '%').width || 0);
    measure.restore();
    const maxW = Math.max(0, ...labelWidths, ...pctWidths);
    pieSidePadding = Math.ceil(maxW + 28);
  } catch (e) {
    pieSidePadding = 60;
  }
  charts.pie = new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: pieData.map(d => d.label),
      datasets: [{
        data: pieData.map(d => d.value),
        backgroundColor: ['#106396', '#e4185b', '#ecb41f', '#25b67b', '#9f2064', '#44174c', '#26a4b4', '#e06b26'], 
        borderWidth: 0  // Removes white borders between slices
      }]
    },
    options: { 
      responsive: true,
      // clicking a pie slice toggles the location filter
      onClick: (evt, activeElements) => {
        if (!activeElements || !activeElements.length) return;
        const idx = activeElements[0].index;
        const label = pieData[idx].label;
        toggleSelectValue('locationSelect', label);
        updateFromFilters();
      },
      maintainAspectRatio: true,  // Prevents resize loop - keeps aspect ratio
      layout: {
        padding: {
          top: 10,
          bottom: 10,
          left: pieSidePadding,
          right: pieSidePadding  // Balanced padding to fit labels without overflow
        }
      },
      plugins: { 
        legend: { 
          display: false
        },
        // Disable datalabels for pie; we draw outside labels with the plugin
        datalabels: { display: false },
        tooltip: {
          enabled: false,
          callbacks: {
            label: (context) => {
              const value = context.parsed || 0;
              const dataArr = context.chart.data.datasets[0].data;
              const total = dataArr.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (value / total * 100) : 0;
              return `${pct.toFixed(1)}%`;
            }
          }
        }
      }
    }
  });

  // Donut: Language Breakdown (job counts)
  const langCounts = {};
  // Respect the language filter selection: if specific languages are selected, only count those
  const currentSelectedLangs = Array.from(document.getElementById('languageSelect').selectedOptions).map(opt => opt.value);
  const effectiveSelectedLangs = (currentSelectedLangs.includes('All') || currentSelectedLangs.length === 0) ? null : currentSelectedLangs;
  jobs.forEach(job => {
    (job['Language'] || []).forEach(lang => {
      if (effectiveSelectedLangs && !effectiveSelectedLangs.includes(lang)) return; // skip languages not in current selection
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    });
  });
  const totalLangs = Object.values(langCounts).reduce((a, b) => a + b, 0);
  const donutCtx = document.getElementById('donutChart').getContext('2d');
  // Measure maximum label widths (language + percentage) to determine side padding
  let sidePadding = 40; // default minimal padding
  try {
    // use the canvas context to measure text width with same fonts as plugin
    const measureCtx = donutCtx;
    measureCtx.save();
    measureCtx.font = 'bold 12px var(--font-body)';
    const labels = Object.keys(langCounts);
    const counts = Object.values(langCounts);
    const pctStrings = counts.map(c => {
      const pct = totalLangs > 0 ? (c / totalLangs * 100) : 0;
      return pct.toFixed(1) + '%';
    });
    const labelWidths = labels.map(l => measureCtx.measureText(l).width || 0);
    measureCtx.font = '14px var(--font-body)';
    const pctWidths = pctStrings.map(p => measureCtx.measureText(p).width || 0);
    measureCtx.restore();
    const maxLabelWidth = Math.max(0, ...labelWidths, ...pctWidths);
    // Add some breathing room for the leader line and offsets
    sidePadding = Math.ceil(maxLabelWidth + 28);
  } catch (e) {
    // if measureText fails (fonts not loaded), keep default padding
    sidePadding = 60;
  }
  charts.donut = new Chart(donutCtx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(langCounts),
      datasets: [{
        data: Object.values(langCounts),
        backgroundColor: ['#e4185b', '#9f2064', '#44174c', '#106396', '#26a4b4', '#25b67b', '#ecb41f', '#e06b26'],
        borderWidth: 0  // Removes white borders between segments
      }]
    },
    options: { 
      responsive: true,
      // clicking a donut slice toggles the language filter
      onClick: (evt, activeElements) => {
        if (!activeElements || !activeElements.length) return;
        const idx = activeElements[0].index;
        const label = Object.keys(langCounts)[idx];
        toggleSelectValue('languageSelect', label);
        updateFromFilters();
      },
      maintainAspectRatio: true,  // Prevents resize loop - keeps aspect ratio
      layout: {
        padding: {
          top: 10,
          bottom: 10,
          left: sidePadding,
          right: sidePadding  // Balanced padding to fit outside labels
        }
      },
      plugins: { 
        legend: { display: false },
        // Keep counts inside slices
        datalabels: {
          display: true,
          anchor: 'center',
          align: 'center',
          formatter: (value, context) => {
            // Always show the raw count inside the slice if > 0
            if (!value || value <= 0) return '';
            return String(value);
          },
          color: '#fff',
          backgroundColor: null,
          font: {
            size: 14,
            weight: 'bold',
            family: 'var(--font-body)'
          }
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) => {
              const value = context.parsed || 0;
              const dataArr = context.chart.data.datasets[0].data;
              const total = dataArr.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (value / total * 100) : 0;
              return `${pct.toFixed(1)}%`;
            }
          }
        }
      },
    },
    // Custom plugin will draw leader lines and outside labels
    plugins: [
      {
        id: 'donutLeaderLines',
        afterDraw: (chart) => {
          if (!chart || chart.config.type !== 'doughnut') return;
          const ctx = chart.ctx;
          const dataset = chart.data.datasets[0];
          const meta = chart.getDatasetMeta(0);
          const total = dataset.data.reduce((a, b) => a + b, 0);
          meta.data.forEach((arc, i) => {
            const value = dataset.data[i];
            const pct = total > 0 ? (value / total * 100) : 0;
            // Skip drawing outside label if slice too small
            if (pct < LABEL_THRESHOLD_PCT) return;

            // Arc center and angles
            const centerX = arc.x;
            const centerY = arc.y;
            const startAngle = arc.startAngle;
            const endAngle = arc.endAngle;
            const midAngle = (startAngle + endAngle) / 2;

            // Point on outer edge
            const outerRadius = arc.outerRadius;
            const sx = centerX + Math.cos(midAngle) * (outerRadius);
            const sy = centerY + Math.sin(midAngle) * (outerRadius);

            // End point further out for label anchor
            const labelRadius = outerRadius + 22;
            const ex = centerX + Math.cos(midAngle) * labelRadius;
            const ey = centerY + Math.sin(midAngle) * labelRadius;

            // Draw leader line
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 1;
            ctx.moveTo(sx, sy);
            // mid-point indentation for nicer line (horizontal)
            const midX = centerX + Math.cos(midAngle) * (outerRadius + 8);
            const midY = centerY + Math.sin(midAngle) * (outerRadius + 8);
            ctx.lineTo(midX, midY);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            // Draw language (black) above percent (grey)
            const label = chart.data.labels[i] || '';
            const textAlign = (midAngle > Math.PI/2 && midAngle < 3*Math.PI/2) ? 'right' : 'left';
            const textX = ex + (textAlign === 'right' ? -6 : 6);
            ctx.textAlign = textAlign;
            ctx.textBaseline = 'bottom';
            ctx.font = 'bold 14px var(--font-body)';
            ctx.fillStyle = '#000';
            ctx.fillText(label, textX, ey - 2);
            ctx.font = '14px var(--font-body)';
            ctx.fillStyle = '#586275';
            ctx.textBaseline = 'top';
            ctx.fillText(pct.toFixed(1) + '%', textX, ey + 2);
            ctx.restore();
          });
        }
      }
    ]
  });

  // Bar: Salary Breakdown (overall min/avg/max)
  const salaries = jobs
    .map(job => job['Salary Range']?.avg)
    .filter(salary => salary !== undefined && salary !== null && salary > 0);

  const minSalary = salaries.length > 0 ? Math.min(...salaries) : 0;
  const avgSalary = salaries.length > 0 ? salaries.reduce((a, b) => a + b, 0) / salaries.length : 0;
  const maxSalary = salaries.length > 0 ? Math.max(...salaries) : 0;

  const barCtx = document.getElementById('barChart').getContext('2d');
  charts.bar = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: ['Min', 'Average', 'Max'],
      datasets: [{
        label: '',
        data: [minSalary, avgSalary, maxSalary],
        backgroundColor: '#ecb41f',
        borderWidth: 1,
        borderColor: '#ecb41f'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: false,
        },
        tooltip: {
          enabled: false, // Tooltips disabled
          callbacks: {
            label: function(context) {
              return '$' + context.parsed.y.toLocaleString();
            }
          }
        },
        datalabels: {
          display: false // Disables any chartjs-plugin-datalabels if active
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: false
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)' 
          },
          ticks: {
            color: '#333', 
            stepSize: 50000, // Increment by $50,000
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        },
        x: {
          title: {
            display: false
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)' 
          },
          ticks: {
            color: '#000000ff'
          }
        }
      },
      animation: {
        onComplete: () => {}
      }
    },
    // Draw values on top of bars after datasets are rendered
    plugins: [{
      afterDatasetsDraw: (chart) => {
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = "bold 14px var(--font-body)";
        ctx.fillStyle = "#000"; 
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        chart.data.datasets.forEach((dataset, i) => {
          const meta = chart.getDatasetMeta(i);
          meta.data.forEach((element, index) => {
            const data = dataset.data[index];
            if (data > 0) { // Skip if zero
              const label = '$' + Math.round(data).toLocaleString();
              ctx.fillText(label, element.x, element.y - 5);
            }
          });
        });

        ctx.restore();
      }
    }]
  });
}

// DOMContentLoaded initialization: register chart plugins, set defaults, fetch data and wire events.
document.addEventListener("DOMContentLoaded", async () => {
  // Register datalabels plugin (required for v4+)
  Chart.register(ChartDataLabels);
  // Register donut leader-lines plugin globally to ensure it runs before charts are created
  Chart.register({
    id: 'donutLeaderLines',
    afterDraw: (chart) => {
      // support both doughnut and pie charts
      if (!chart || (chart.config.type !== 'doughnut' && chart.config.type !== 'pie')) return;
      const ctx = chart.ctx;
      const dataset = chart.data.datasets[0];
      const meta = chart.getDatasetMeta(0);
      const total = dataset.data.reduce((a, b) => a + b, 0);
      meta.data.forEach((arc, i) => {
        const value = dataset.data[i];
        const pct = total > 0 ? (value / total * 100) : 0;
        if (pct < LABEL_THRESHOLD_PCT) return;

        const centerX = arc.x;
        const centerY = arc.y;
        const startAngle = arc.startAngle;
        const endAngle = arc.endAngle;
        const midAngle = (startAngle + endAngle) / 2;

        const outerRadius = arc.outerRadius;
        const sx = centerX + Math.cos(midAngle) * (outerRadius);
        const sy = centerY + Math.sin(midAngle) * (outerRadius);

        const labelRadius = outerRadius + 22;
        const ex = centerX + Math.cos(midAngle) * labelRadius;
        const ey = centerY + Math.sin(midAngle) * labelRadius;

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.moveTo(sx, sy);
        const midX = centerX + Math.cos(midAngle) * (outerRadius + 8);
        const midY = centerY + Math.sin(midAngle) * (outerRadius + 8);
        ctx.lineTo(midX, midY);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // For pie charts use the short location label mapping, for donuts use the language label
        const rawLabel = chart.data.labels[i] || '';
        const label = (chart.config.type === 'pie') ? getShortLocationLabel(rawLabel) : rawLabel;
        const textAlign = (midAngle > Math.PI/2 && midAngle < 3*Math.PI/2) ? 'right' : 'left';
        const textX = ex + (textAlign === 'right' ? -6 : 6);
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'bottom';
        ctx.font = 'bold 14px var(--font-body)';
        ctx.fillStyle = '#000';
        ctx.fillText(label, textX, ey - 2);
        ctx.font = '14px var(--font-body)';
        ctx.fillStyle = '#586275';
        ctx.textBaseline = 'top';
        ctx.fillText(pct.toFixed(1) + '%', textX, ey + 2);
        ctx.restore();
      });
    }
  });
  
  const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTjCxhcf73XCjoHZM2NtJ5WCrVEj2gGvH5QrnHnpsuSe1tcP_rfg8CFXbiOnQ64s1gOksAE6QFYknGR/pub?output=csv";

  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const updateBtn = document.getElementById("updateBtn");
  const loadingOverlay = document.getElementById('loadingOverlay');

  // Show overlay immediately while we fetch data and render charts
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
    loadingOverlay.setAttribute('aria-hidden', 'false');
  }

  // Default to last 90 days — only set defaults if inputs are empty to avoid visual blink
  try {
    const today = new Date();
    const last90 = new Date(today);
    last90.setDate(today.getDate() - 90);
    if (startDateInput && !startDateInput.value) startDateInput.value = last90.toISOString().split('T')[0];
    if (endDateInput && !endDateInput.value) endDateInput.value = today.toISOString().split('T')[0];
  } catch (e) {
    // no-op
  }

  // Initial load of CSV and UI setup
  try {
    await initialLoad(sheetUrl);
  } finally {
    // Hide overlay when load completes or errors
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
      loadingOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  // Event listeners for date changes
  // The Update button may have been removed from the DOM; guard before attaching.
  if (updateBtn) {
    updateBtn.addEventListener("click", updateFromFilters);
  }
  startDateInput.addEventListener("change", updateFromFilters);
  endDateInput.addEventListener("change", updateFromFilters);
});