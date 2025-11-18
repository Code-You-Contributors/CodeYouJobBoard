let activeJobs = [];
let tableHeaders = [];
let sortState = { key: null, direction: "asc" };
let perPage = 10;
let totalPages = 0;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", async () => {
  // const sheetUrl =
  //   "https://docs.google.com/spreadsheets/d/e/2PACX-1vTjCxhcf73XCjoHZM2NtJ5WCrVEj2gGvH5QrnHnpsuSe1tcP_rfg8CFXbiOnQ64s1gOksAE6QFYknGR/pub?output=csv";
   const sheetUrl = "/api/sheet";
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => {
    refreshView(activeJobs);
  });

  const pathwayInput = document.getElementById("pathwayFilter");
  pathwayInput.addEventListener("change", () => {
    refreshView(activeJobs);
  });

  const locationInput = document.getElementById("locationFilter");
  locationInput.addEventListener("change", () => {
    refreshView(activeJobs);
  });

  try {
    const csvText = await fetchJobData(sheetUrl);
    const jobData = parseJobData(csvText);
    const allJobs = createJobs(jobData.tableHeaders, jobData.jobs);
    activeJobs = getActiveJobs(allJobs);

    tableHeaders = jobData.tableHeaders;
    refreshView(activeJobs);
  } catch (error) {
    console.error("Error loading sheet:", error);
  }
});

async function fetchJobData(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load jobs (${response.status})`);
  }
  console.log(response);
  
  const payload = await response.json();
  if (!payload?.values?.length) {
    throw new Error("Job payload missing values array");
  }
  console.log("Fetched job data:", payload.values);
  return payload.values;
}



function parseJobData(values) {
  const [headers = [], ...rows] = values;
  const normalizedRows = rows
    .filter((row) => row.some((cell) => cell && cell.trim() !== ""))
    .map((row) => replaceUnderscoresInRow(headers.map((_, idx) => row[idx] ?? "")));

  return {
    tableHeaders: headers,
    jobs: normalizedRows,
  };
}

function createJobs(keys, jobData) {
  const result = [];

  jobData.forEach((job, rowIndex) => {  // Added rowIndex for logging
    const parsedJob = {};
    
    // Hotfix: Skip if row is shorter than expected columns
    if (job.length < keys.length) {
      console.warn(`Skipping malformed row ${rowIndex + 2}: Expected ${keys.length} columns, got ${job.length}`, job);  // +2 assumes header + 1-based
      return;
    }

    keys.forEach((key, index) => {
      const cellValue = job[index];  // Raw cell
      if (cellValue === undefined || cellValue === null) {
        // Safeguard: Default to empty for missing cells (rare if length check passes)
        parsedJob[key] = '';
        console.warn(`Empty cell at row ${rowIndex + 2}, col ${index} (${key})`);
        return;
      }

      const trimmedKey = key.trim();
      const trimmedCell = String(cellValue).trim();  // Safe trim

      if (trimmedKey.toLowerCase() === "date") {
        parsedJob[key] = parseDate(trimmedCell);
      } else if (trimmedKey.toLowerCase() === "deactivate?") {
        // Convert the deactivate? field to an actual boolean
        parsedJob[key] = trimmedCell.toLowerCase() !== "false";
      } else if (trimmedKey.toLowerCase().includes("salary")) {
        // Parse the salary values to floats
        const salaryRange = trimmedCell.replace(/[$,]/g, "").split("-");
        const min = parseFloat(salaryRange[0].trim()) || null;
        const max = salaryRange.length > 1 ? parseFloat(salaryRange[1].trim()) || null : null;

        parsedJob[key] = { min, max };
      } else if (trimmedKey.toLowerCase() === "language") {
        parsedJob[key] = trimmedCell.split(",").map(lang => lang.trim()).filter(lang => lang);
      } else {
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

function getActiveJobs(allJobs) {
  return allJobs.filter((job) => !job["Deactivate?"]);
}

function parseDate(str) {
  const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(\d{4})$/;
  const match = str.match(regex);
  if (!match) return null;

  const [, mm, dd, yyyy] = match;
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);

  if (date.getMonth() + 1 !== parseInt(mm) || date.getDate() !== parseInt(dd)) {
    return null;
  }

  return date;
}

function refreshView(items) {
 /**
 * Current page number in the pagination system.
 * @type {number}
 */
let currentPage = 1;

/**
 * Filters the list of items based on predefined criteria.
 * @param {Array} items - The full list of items to filter.
 * @returns {Array} The filtered list of items.
 */
const filteredItems = applyFilters(items);

/**
 * Sorts the filtered items based on the current sort state.
 * @param {Array} items - The list of filtered items.
 * @param {Object} sortState - The current sorting configuration.
 * @returns {void}
 */
sortItems(filteredItems, sortState);

/**
 * Renders the filtered and sorted items into a table view.
 * @param {Array} items - The list of items to render.
 * @returns {void}
 */
renderTable(filteredItems);

/**
 * Updates job statistics based on the current list of items.
 * @param {Array} items - The list of items used to calculate stats.
 * @returns {void}
 */
updateJobStats(filteredItems);
}

function applyFilters(items) {
  const criteria = getFilterCriteria();

  return filterItems(items, criteria);
}

/**
 * Retrieves and trims filter criteria from DOM input elements.
 * This function collects user-entered values for search, pathway, and location filters,
 * trims any leading/trailing whitespace, and returns them as an object.
 * 
 * @returns {Object} An object containing the trimmed filter values:
 *                   - searchTerm: string from #searchInput
 *                   - pathway: string from #pathwayFilter
 *                   - location: string from #locationFilter
 * @example
 * const criteria = getFilterCriteria();
 * // criteria = { searchTerm: "engineer", pathway: "Python", location: "Eastern KY" }
 */
function getFilterCriteria() {
  const result = {
    searchTerm: document.getElementById("searchInput").value.trim(),
    pathway: document.getElementById("pathwayFilter").value.trim(),
    location: document.getElementById("locationFilter").value.trim(),
  };

  return result;
}

function filterItems(items, criteria) {
  let result = [...items];

  if (criteria.searchTerm) {
    result = getSearchResults(result, criteria.searchTerm);
  }

  if (criteria.pathway) {
    result = result.filter(
      (item) => item["Pathway"].trim() === criteria.pathway
    );
  }

  if (criteria.location) {
    result = result.filter(
      (item) => item["Location"].trim() === criteria.location
    );
  }

  return result;
}

/**
 * Filters a list of job items based on a search term.
 *
 * The function checks if the search term is included in the employer name,
 * job title, or any of the listed languages (case-insensitive).
 *
 * @param {Array<Object>} itemsToSearch - The array of job objects to search through.
 * Each object should have the keys: "Employer", "Job Title", and "Language" (an array of strings).
 * @param {string} searchTerm - The lowercase search term to match against job fields.
 * @returns {Array<Object>} A filtered array of job objects that match the search term.
 */

function getSearchResults(itemsToSearch, searchTerm) {
  const result = itemsToSearch.filter((item) => {
    const employer = item["Employer"].trim().toLowerCase();
    const jobTitle = item["Job Title"].trim().toLowerCase();

    return (
      employer.includes(searchTerm) ||
      jobTitle.includes(searchTerm) ||
      item["Language"].some((lang) =>
        lang.trim().toLowerCase().includes(searchTerm)
      )
    );
  });

  return result;
}

// function parseCSVLine(line) {
//   if (!line.trim()) return []; // skip blank lines
//   return (
//     line.match(/("([^"]|"")*"|[^,]*)(?=,|$)/g)?.map((cell) => {
//       cell = cell.trim();
//       if (cell.startsWith('"') && cell.endsWith('"')) {
//         cell = cell.slice(1, -1).replace(/""/g, '"');
//       }
//       return cell;
//     }) || []
//   );
// }

/**
 * Replaces all underscores in the column of a row array with spaces.
 * This function creates a shallow copy of the input row to avoid mutating the original,
 * modifies only the specified index ("Location" column), and returns the updated array. 
 * - Used during CSV parsing to clean up underscored text in Location field
 * 
 * @param {Array<string>} row - The array representing a parsed CSV row
 * @returns {Array<string>} A new array with underscores replaced
 * @example
 * const inputRow = ['Val1', 'Val2', 'Val3', 'Val4', 'Val5', 'Val6', 'Val7', 'Central_KY', 'Val9'];
 * const output = replaceUnderscoresInRow(inputRow);
 * // output = ['Val1', 'Val2', 'Val3', 'Val4', 'Val5', 'Val6', 'Val7', 'Central KY', 'Val9']
 */
function replaceUnderscoresInRow(row) {
  const newRow = [...row];
  newRow[7] = newRow[7].replaceAll("_", " ");
  return newRow;
}

function parseDollar(str) {
  return parseFloat(str.replace(/[$,]/g, ""));
}

function formatDollar(amount) {
  /**
 * Formats a numeric amount into a US dollar string.
 *
 * Adds a dollar sign and formats the number with comma separators
 * and exactly two decimal places (e.g., "$1,234.56").
 *
 * @param {number} amount - The numeric value to format.
 * @returns {string} The formatted dollar string.
 */
  return (
    "$" +
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function renderTable(tableItems) {
  const tableEl = document.getElementById("jobTable");
  const jobDataStatusEl = document.querySelector(".job-data-status");
  const tableWrapper = document.querySelector(".table-wrapper");

  if (tableItems.length === 0) {
    jobDataStatusEl.textContent = "No Jobs Posted in the Last 30 Days";
    jobDataStatusEl.classList.remove("no-display");
    tableWrapper.classList.add("no-display");
    return;
  }
  const itemsToDisplay = paginate(tableItems, currentPage, perPage);
  tableEl.innerHTML = "";

  renderHeader(tableEl, tableHeaders, tableItems);
  const tableBody = document.createElement("tbody");
  tableBody.id = "jobTableBody";

  itemsToDisplay.forEach((item) => {
    if (item.length < 9) return;

    const tr = document.createElement("tr");

    tableHeaders.forEach((header) => {
      const lowerHeader = header.trim().toLowerCase();
      if (lowerHeader.includes("deactivate")) return;
      const td = document.createElement("td");
      td.textContent = item[header];

      if (lowerHeader.includes("date"))
        td.textContent = item[header].toLocaleString().split(",")[0];

      if (lowerHeader.includes("salary")) {
        const min = item[header].min;
        const max = item[header].max;

        if (!min) {
          td.textContent = "Not Provided";
        } else {
          td.textContent = `${formatDollar(min)}${
            max ? ` - ${formatDollar(max)}` : ""
          }`;
        }
      }

      if (lowerHeader.includes("language")) {
        td.textContent = item[header].join(", ");
      }

      if (lowerHeader.includes("apply")) {
        if (item[header].length > 4) {
          const firstFiveChars = item[header].substring(0, 5);
          if (firstFiveChars.includes("http")) {
            td.textContent = "";
            const applyLink = document.createElement("a");
            applyLink.target = "_blank";
            applyLink.href = item[header];
            applyLink.textContent = "Apply Now";
            td.appendChild(applyLink);
          }
        }
      }

      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });

  tableEl.appendChild(tableBody);
  renderPaginationControls(tableItems);
  tableWrapper.classList.remove("no-display");
  jobDataStatusEl.classList.add("no-display");
}

/**
 * Creates and adds a table header to an HTML table.
 * @param {HTMLElement} tableEl - The table element to add the header to.
 * @param {string[]} headers - Array of column names for the header.
 * @param {Object[]} tableItems - Array of job objects to be displayed.
 */
function renderHeader(tableEl, headers, tableItems) {
  // Create a <thead> element to hold the table header
  const thead = document.createElement("thead");
  // Create a <tr> element for the header row
  const tr = document.createElement("tr");
  // Define indices of columns that can be sorted
  const sortableColumns = [0, 1, 2, 3, 5, 6, 7];

  // Loop through each header name with its index
  headers.forEach((header, colIndex) => {
    // Skip headers containing "deactivate" (case-insensitive)
    if (header.trim().toLowerCase().includes("deactivate")) return;

    // Create a <th> element for the header cell
    const th = document.createElement("th");
    // Set the header text
    th.textContent = header;
    // Add a class to prevent text selection
    th.classList.add("no-select");

    // Add sort indicator ( ▲ or ▼ ) if this header is currently sorted
    if (header === sortState.key) {
      th.textContent += sortState.direction === "asc" ? " ▲" : " ▼";
    }

    // Make header sortable if its index is in sortableColumns
    if (sortableColumns.includes(colIndex)) {
      // Add class to style sortable headers
      th.classList.add("sortable-header");

      // Add click event listener to toggle sort direction and refresh table
      th.addEventListener("click", () => {
        // Switch direction if the same column is clicked, otherwise default to ascending
        const newDirection =
          sortState.key === header && sortState.direction === "asc"
            ? "desc"
            : "asc";

        // Update sort state
        sortState = { key: header, direction: newDirection };
        // Refresh table with updated sort
        refreshView(tableItems);
      });
    }

    // Add the header cell to the row
    tr.appendChild(th);
  });


  // Add the header row to the <thead>
  thead.appendChild(tr);
  // Add the <thead> to the table
  tableEl.appendChild(thead);
}

function paginate(items, currentPage = 1, perPage = 20) {
  totalPages = Math.ceil(items.length / perPage);
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  return items.slice(start, end);
}

function renderPaginationControls(tableItems) {
  /**
  * Updates the pagination controls for a table view.
 *
 * Clears existing controls and adds a "Previous" button if the current page is not the first.
 * The button decrements the current page and re-renders the table when clicked.
 *
 * @param {number} totalPages - Total number of pages available.
 * @param {number} currentPage - The current page number being viewed.
 * @param {Array<Object>} tableItems - The items to render in the table.
 * @param {Function} renderTable - Callback function to render the table with updated items.
 */
  const controlsElement = document.getElementById("pagination-controls");
  controlsElement.innerHTML = "";
  if (totalPages <= 1) return;

  if (currentPage !== 1) {
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "◀ Prev";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      currentPage--;
      renderTable(tableItems);
    };
    controlsElement.appendChild(prevBtn);
  }

  const pageRange = getPaginationRange(currentPage, totalPages);
  pageRange.forEach((p) => {
    if (p === "…") {
      const ellipsisBtn = document.createElement("button");
      ellipsisBtn.textContent = "…";
      ellipsisBtn.onclick = () => {
        const input = prompt("Enter page number:");
        let targetPage = parseInt(input, 10);
        if (isNaN(targetPage) || targetPage < 1) targetPage = currentPage;
        if (targetPage > totalPages) targetPage = totalPages;
        currentPage = targetPage;
        renderTable(tableItems);
      };
      controlsElement.appendChild(ellipsisBtn);
    } else {
      const pageBtn = document.createElement("button");
      pageBtn.textContent = p;
      if (p === currentPage) pageBtn.disabled = true;
      pageBtn.onclick = () => {
        currentPage = p;
        renderTable(tableItems);
      };
      controlsElement.appendChild(pageBtn);
    }
  });

  if (currentPage !== totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next ▶";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      currentPage++;
      renderTable(tableItems);
    };
    controlsElement.appendChild(nextBtn);
  }
}

function getPaginationRange(current, total) {
  const viewportWidth = window.outerWidth;
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

  let last = null;
  for (let i of range) {
    if (last) {
      if (i - last === 2) {
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

/**
 * Updates the job stats displayed on the dashboard based on a list of job objects.
 * This function modifies DOM elements to show the total job count, salary range (min to max across all jobs),
 * and a comma-separated list of skill counts (aggregated from languages in each job).
 * - Handles edge cases like no jobs or missing salary data by setting fallback text
 * - Relies on formatDollar() for currency formatting
 * 
 * @param {Array<Object>} jobs - The array of job objects to compute stats from
 * @returns {void} Updates DOM elements directly; no return value
 */
function updateJobStats(jobs) {
  const jobCountEl = document.getElementById("job-count");
  const payRangeEl = document.getElementById("pay-range");
  const skillsEl = document.getElementById("skills-list");

  // Handles no jobs case by setting default text
  if (jobs.length === 0) {
    jobCountEl.textContent = "0";
    payRangeEl.textContent = "No Salary Data";
    skillsEl.textContent = "No Skills Data";
    return;
  }

  // Sets the job count display to the number of jobs
  jobCountEl.textContent = jobs.length;

  // Shows min and max salary
  // - Calculates the overall minimum and maximum salary across all jobs
  let minSalary = Infinity;
  let maxSalary = -Infinity;

  jobs.forEach((job) => {
    minSalary = Math.min(minSalary, job["Salary Range"].min);

    if (!job["Salary Range"].max) {
      maxSalary = Math.max(maxSalary, job["Salary Range"].min);
    } else {
      maxSalary = maxSalary = Math.max(maxSalary, job["Salary Range"].max);
    }
  });

  // Sets the pay range text: fallback if no valid salaries, else formatted min-max
  // - Uses formatDollar() to convert numbers to currency strings
  if (!minSalary && !maxSalary) {
    payRangeEl.textContent = "No Data Available";
  } else {
    payRangeEl.textContent = `${formatDollar(minSalary)} - ${formatDollar(
      maxSalary
    )}`;
  }

  // Gets skill counts
  // - Aggregates counts of each unique skill/language across all jobs
  // - Uses an object as a map for efficient counting
  const skillCounts = {};
  jobs.forEach((job) => {
    job["Language"].forEach((lang) => {
      if (lang in skillCounts) {
        skillCounts[lang]++;
      } else {
        skillCounts[lang] = 1;
      }
    });
  });

  // Sets the skills list text
  // - Converts skill counts object into a comma-separated string for display
  const skillsText = Object.entries(skillCounts)
    .map(([skill, count]) => `${skill}: ${count}`)
    .join(", ");

  skillsEl.textContent = skillsText;
}

function sortItems(items, sortState) {
  const { key, direction } = sortState;
  if (!key) return;

  items.sort((a, b) => {
    const valA = a[key];
    const valB = b[key];

    if (key.toLowerCase().includes("salary")) {
      return (valA.min - valB.min) * (direction === "asc" ? 1 : -1);
    } else if (key.toLowerCase().includes("date")) {
      return (valA - valB) * (direction === "asc" ? 1 : -1);
    } else {
      return valA.localeCompare(valB) * (direction === "asc" ? 1 : -1);
    }
  });
}
