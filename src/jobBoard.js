let activeJobs = [];
let tableHeaders = [];
let sortState = { key: null, direction: "asc" };
let perPage = 10;
let totalPages = 0;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", async () => {
  const sheetUrl =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTjCxhcf73XCjoHZM2NtJ5WCrVEj2gGvH5QrnHnpsuSe1tcP_rfg8CFXbiOnQ64s1gOksAE6QFYknGR/pub?output=csv";

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
  let result;

  const response = await fetch(url);
  result = await response.text();

  return result;
}

function parseJobData(data) {
  let result = {};

  const jobData = data
    .trim()
    .split(/\r?\n/)
    .map(parseCSVLine)
    .filter((row) => row.length)
    .map((row) => row.filter((cell) => cell !== ""))
    .filter((row) => row.length === 9)
    .map(replaceUnderscoresInRow);

  result.tableHeaders = [...jobData[0]];
  result.jobs = [...jobData.slice(1)];

  return result;
}

function createJobs(keys, jobData) {
  const result = [];

  jobData.forEach((job) => {
    const parsedJob = {};
    if (job.length < 9) return;

    keys.forEach((key, index) => {
      if (key.trim().toLowerCase() === "date") {
        parsedJob[key] = parseDate(job[index]);
      } else if (key.trim().toLowerCase() === "deactivate?") {
        // Convert the deactivate? field to an actual boolean
        if (job[index].trim().toLowerCase() === "false") {
          parsedJob[key] = false;
        } else {
          parsedJob[key] = true;
        }
      } else if (key.trim().toLowerCase().includes("salary")) {
        // Parse the salary values to floats
        const salaryRange = job[index].trim().replace(/[$,]/g, "").split("-");
        const min = parseFloat(salaryRange[0].trim());
        const max =
          salaryRange.length > 1 ? parseFloat(salaryRange[1].trim()) : null;

        parsedJob[key] = { min, max };
      } else if (key.trim().toLowerCase() === "language") {
        parsedJob[key] = job[index].split(",");
      } else {
        parsedJob[key] = job[index].trim();
      }
    });

    result.push(parsedJob);
  });

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
  currentPage = 1;
  const filteredItems = applyFilters(items);

  sortItems(filteredItems, sortState);
  renderTable(filteredItems);
  updateJobStats(filteredItems);
}

function applyFilters(items) {
  const criteria = getFilterCriteria();

  return filterItems(items, criteria);
}

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

function parseCSVLine(line) {
  if (!line.trim()) return []; // skip blank lines
  return (
    line.match(/("([^"]|"")*"|[^,]*)(?=,|$)/g)?.map((cell) => {
      cell = cell.trim();
      if (cell.startsWith('"') && cell.endsWith('"')) {
        cell = cell.slice(1, -1).replace(/""/g, '"');
      }
      return cell;
    }) || []
  );
}

function replaceUnderscoresInRow(row) {
  const newRow = [...row];
  newRow[7] = newRow[7].replaceAll("_", " ");
  return newRow;
}

function parseDollar(str) {
  return parseFloat(str.replace(/[$,]/g, ""));
}

function formatDollar(amount) {
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

  if (tableItems.length === 0) {
    jobDataStatusEl.textContent = "No Jobs Posted in the Last 30 Days";
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

        td.textContent = `${formatDollar(min)}${
          max ? ` - ${formatDollar(max)}` : ""
        }`;
      }

      if (lowerHeader.includes("language")) {
        td.textContent = item[header].join(", ");
      }

      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });

  tableEl.appendChild(tableBody);
  renderPaginationControls(tableItems);
  const tableWrapper = document.querySelector(".table-wrapper");
  tableWrapper.classList.remove("no-display");
  jobDataStatusEl.classList.add("no-display");
}

function renderHeader(tableEl, headers, tableItems) {
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  const sortableColumns = [0, 1, 2, 3, 5, 6, 7];

  headers.forEach((header, colIndex) => {
    if (header.trim().toLowerCase().includes("deactivate")) return;

    const th = document.createElement("th");
    th.textContent = header;
    th.classList.add("no-select");

    if (header === sortState.key) {
      th.textContent += sortState.direction === "asc" ? " ▲" : " ▼";
    }

    if (sortableColumns.includes(colIndex)) {
      th.classList.add("sortable-header");

      th.addEventListener("click", () => {
        const newDirection =
          sortState.key === header && sortState.direction === "asc"
            ? "desc"
            : "asc";

        sortState = { key: header, direction: newDirection };
        refreshView(tableItems);
      });
    }

    tr.appendChild(th);
  });

  thead.appendChild(tr);
  tableEl.appendChild(thead);
}

function paginate(items, currentPage = 1, perPage = 20) {
  totalPages = Math.ceil(items.length / perPage);
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  return items.slice(start, end);
}

function renderPaginationControls(tableItems) {
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

function updateJobStats(jobs) {
  const jobCountEl = document.getElementById("job-count");
  const payRangeEl = document.getElementById("pay-range");
  const skillsEl = document.getElementById("skills-list");

  if (jobs.length === 0) {
    jobCountEl.textContent = "0";
    payRangeEl.textContent = "No Salary Data";
    skillsEl.textContent = "No Skills Data";
    return;
  }

  jobCountEl.textContent = jobs.length;

  // Show min and max salary
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

  payRangeEl.textContent = `${formatDollar(minSalary)} - ${formatDollar(
    maxSalary
  )}`;

  // Get skill counts
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

  // Turn into a display string
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
