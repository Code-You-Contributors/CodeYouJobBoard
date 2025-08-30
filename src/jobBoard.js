let activeJobs = [];
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

  try {
    const jobData = await fetchJobData(sheetUrl);
    activeJobs = parseJobData(jobData);
    populateJobCount(activeJobs);
    renderTable(activeJobs);
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
  let result;

  result = data
    .trim()
    .split(/\r?\n/)
    .map(parseCSVLine)
    .filter((row) => row.length)
    .map((row) => row.filter((cell) => cell !== ""))
    .map(replaceUnderscoresInRow)
    .filter((row) => row[8].trim().toLowerCase() === "false");

  return result;
}

function applyFilters(items) {
  currentPage = 1;
  const criteria = getFilterCriteria();
  const filteredItems = filterItems(items, criteria);
  renderTable(filteredItems);
  populateJobCount(filteredItems);
}

function getFilterCriteria() {
  const result = {
    searchTerm: document.getElementById("searchInput").value.trim(),
  };

  return result;
}

function filterItems(items, criteria) {
  let result = [...items];

  if (criteria.searchTerm) {
    result = getSearchResults(result, criteria.searchTerm);
  }

  return result;
}

function getSearchResults(itemsToSearch, searchTerm) {
  const result = itemsToSearch.filter((item) => {
    const employer = item[1].trim().toLowerCase();
    const jobTitle = item[2].trim().toLowerCase();
    const skills = item[4].trim().toLowerCase();

    return (
      employer.includes(searchTerm) ||
      jobTitle.includes(searchTerm) ||
      skills.includes(searchTerm)
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

function populateJobCount(jobList) {
  document.getElementById("job-count").innerText = jobList.length;
}

function renderTable(tableItems) {
  const tableBody = document.getElementById("jobTableBody");
  const itemsToDisplay = paginate(tableItems, currentPage, perPage);
  tableBody.innerHTML = "";

  itemsToDisplay.forEach((item) => {
    if (item.length < 9) return;

    const tr = document.createElement("tr");

    item.forEach((cell, index) => {
      const td = document.createElement("td");
      if (index === 8 && cell.trim().toLowerCase() === "false") {
        tr.appendChild(td);
        return;
      } else if (index === 8 && cell.trim()) {
        const link = document.createElement("a");
        link.href = cell.trim();
        link.textContent = cell.trim();
        link.target = "_blank";
        td.appendChild(link);
      } else {
        td.textContent = cell.trim();
      }
      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
  renderPaginationControls(tableItems);
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
