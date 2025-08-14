const Statistics = {
    update(rows, headers) {
        // `jobCountEl` = section for displaying num jobs retrieved from API:
        const jobCountEl = document.getElementById('jobCount');
        if (jobCountEl) {
            jobCountEl.textContent = rows.length;
        }

        this.updateSalaryRange(rows, headers);
        this.updateTopSkills(rows, headers);
    },

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

    updateHomepageBadge(activeJobCount) {
        const jobLink = document.querySelector('a[href="/listings.html"]');
        if (jobLink && activeJobCount >= 0) {
            const existingBadge = jobLink.querySelector('.job-count-badge');
            if (existingBadge) {
                existingBadge.textContent = activeJobCount;
            } else {
                jobLink.innerHTML += ` <span class="job-count-badge" style="background: var(--b-orange); color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8em;">${activeJobCount}</span>`;
            }
        }
    }
};