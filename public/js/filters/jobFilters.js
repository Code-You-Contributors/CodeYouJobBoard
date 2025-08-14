const JobFilters = {
    filterBySearch(rows, searchTerm) {
        if (!searchTerm) return rows;
        
        const term = searchTerm.toLowerCase();
        return rows.filter(row => 
            row.some(cell => cell.toString().toLowerCase().includes(term))
        );
    },

    filterByPathway(rows, pathway, headers) {
        if (!pathway) return rows;
        
        const pathwayIndex = headers.indexOf('Pathway');
        if (pathwayIndex === -1) return rows;
        
        return rows.filter(row =>
            row[pathwayIndex] && row[pathwayIndex].toLowerCase().includes(pathway.toLowerCase())
        );
    },

    filterByLocation(rows, location, headers) {
        if (!location) return rows;
        
        const locationIndex = headers.indexOf('Location');
        if (locationIndex === -1) return rows;
        
        return rows.filter(row =>
            row[locationIndex] && row[locationIndex].toLowerCase().includes(location.toLowerCase())
        );
    },

    filterBySkills(rows, skill, headers) {
        if (!skill) return rows;
        
        const languageIndex = headers.indexOf('Language');
        if (languageIndex === -1) return rows;
        
        return rows.filter(row =>
            row[languageIndex] && row[languageIndex].toLowerCase().includes(skill.toLowerCase())
        );
    },

    filterBySalaryRange(rows, rangeValue, headers) {
        if (!rangeValue) return rows;
        
        const salaryIndex = headers.indexOf('Salary Range');
        if (salaryIndex === -1) return rows;
        
        const [min, max] = rangeValue.split('-').map(v => parseInt(v) || 0);
        
        return rows.filter(row => {
            const salaryStr = row[salaryIndex] || '';
            const match = salaryStr.match(/[\d,]+\.?\d*/);
            const salary = match ? parseFloat(match[0].replace(/,/g, '')) : 0;

            if (rangeValue.includes('+')) {
                return salary >= min;
            } else if (max) {
                return salary >= min && salary <= max;
            }
            return true;
        });
    }
};