let activeJobs = [];
let tableHeaders = [];
let perPage = 10;
let totalPages = 0;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", async () => {
  const sheetUrl =
    "https://docs.google.com/spreadsheets/d/1OHIJj0D0Q-2lHgSL184vxBaxhIdSYqzso3UJvcRUflo/gviz/tq?tqx=out:csv";

  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", () => {
    applyFilters(activeJobs);
  });

  const pathwayInput = document.getElementById("pathwayFilter");
  pathwayInput.addEventListener("change", () => {
    applyFilters(activeJobs);
  });

  const locationInput = document.getElementById("locationFilter");
  locationInput.addEventListener("change", () => {
    applyFilters(activeJobs);
  });

  try {
    const csvText = await fetchJobData(sheetUrl);
    const jobData = parseJobData(csvText);
    const allJobs = createJobs(jobData.tableHeaders, jobData.jobs);
    activeJobs = getActiveJobs(allJobs);

    tableHeaders = jobData.tableHeaders;
    applyFilters(activeJobs);
    updateJobStats(activeJobs);
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
    .map(replaceUnderscoresInRow);

  const headers = [...jobData[0]];
  const jobs = createJobs(headers, jobData.slice(1));

  result.tableHeaders = [...jobData[0]];
  result.jobs = [...jobData.slice(1)];

  return result;
}

function createJobs(keys, jobData) {
  const result = [];

  jobData.forEach((job) => {
    const parsedJob = {};

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

function applyFilters(items) {
  currentPage = 1;
  const criteria = getFilterCriteria();
  const filteredItems = filterItems(items, criteria);

  renderTable(filteredItems);
  updateJobStats(filteredItems);
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
    line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map((cell) => {
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
  const itemsToDisplay = paginate(tableItems, currentPage, perPage);
  tableEl.innerHTML = "";

  renderHeader(tableEl, tableHeaders);
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

        td.textContent = `$${min.toLocaleString()}${
          max ? ` - $${max.toLocaleString}` : ""
        }`;
      }

      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });

  tableEl.appendChild(tableBody);
  renderPaginationControls(tableItems);
}

function renderHeader(tableEl, headers) {
  const head = document.createElement("thead");
  const tr = document.createElement("tr");

  headers.forEach((header) => {
    if (header.trim().toLowerCase().includes("deactivate")) return;

    const th = document.createElement("th");
    th.textContent = header;
    tr.appendChild(th);
  });

  head.appendChild(tr);
  tableEl.appendChild(head);
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
  const numNeighboringPages = 2;
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
  payRangeEl.textContent = `Min: $${minSalary.toLocaleString()} - Max: $${maxSalary.toLocaleString()}`;

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
