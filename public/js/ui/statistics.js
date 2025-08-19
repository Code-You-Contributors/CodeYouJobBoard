const Statistics = {
    /**
     * Updates key job statistics on the page.
     * @param {Array} rows - Array of job data rows retrieved from the API.
     * @param {Array} headers - Array of column headers corresponding to each row.
     * 
     * Displays total job count, salary range, and top skills based on parsed job data.
     */
    update(rows, headers) {
        // `jobCountEl` = section for displaying num jobs retrieved from API:
        const jobCountEl = document.getElementById('jobCount');
        if (jobCountEl) {
            jobCountEl.textContent = rows.length;
        }

        this.updateSalaryRange(rows, headers);
        this.updateTopSkills(rows, headers);
    },

    /**
     * Calculates and displays the minimum and maximum salary range.
     * @param {Array} rows - Array of job data rows.
     * @param {Array} headers - Array of column headers.
     * 
     * Extracts numeric values from salary strings, filters out invalid entries,
     * and updates the `#payRange` element with a formatted salary range.
    */
    updateSalaryRange(rows, headers) {
        const salaryIndex = headers.indexOf('Salary Range');
        if (salaryIndex === -1) return;

        const salaries = rows.map(row => {
            const salaryStr = row[salaryIndex] || '';
            // Using `match` here to extract the *numeric* part of 
            // a salary string for further processing
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
    },

    /**
     * Identifies and displays the top 5 most common skills or languages.
     * @param {Array} rows - Array of job data rows.
     * @param {Array} headers - Array of column headers.
     * 
     * Tallies frequency of each language/skill, sorts by popularity,
     * and updates the `#topSkills` element with a formatted list.
    */
    updateTopSkills(rows, headers) {
        const languageIndex = headers.indexOf('Language');
        if (languageIndex === -1) return;

        const languages = {};
        rows.forEach(row => {
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
    },

    /**
     * Adds or updates a badge showing the number of active jobs on the homepage link.
     * @param {number} activeJobCount - Total number of active job listings.
     * 
     * If the badge exists, we update its count. Otherwise, appends a new badge element.
    */
    updateHomepageBadge(activeJobCount) {
        console.log('currJobCount' + activeJobCount);
        const jobLink = document.querySelector('a[href="/listings.html"]');
        if (jobLink && activeJobCount >= 0) {
            if(!jobLink) {
                console.log('no a tag');
            }
            const existingBadge = jobLink.querySelector('.job-count-badge');
            if (existingBadge) {
                existingBadge.textContent = activeJobCount;
            } else {
                jobLink.innerHTML += ` <span class="job-count-badge" style="background: var(--b-orange); color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em;">${activeJobCount}</span>`;
            }
        }
    }
};