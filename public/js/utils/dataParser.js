const DataParser = {
    extractHeadersAndData(data) {
        const values = data.values || [];
        const majorDimension = (data.majorDimension || 'ROWS').toUpperCase();

        if (majorDimension === 'COLUMNS') {
            const headers = values.map(col => col[0] || '');
            const maxLength = Math.max(...values.map(col => col.length - 1));
            const rows = [];

            for (let i = 1; i <= maxLength; i++) {
                const row = [];
                for (let j = 0; j < values.length; j++) {
                    row.push(values[j][i] || '');
                }
                rows.push(row);
            }
            return { headers, rows };
        } else {
            const headers = values[0] || [];
            const rows = values.slice(1);
            return { headers, rows };
        }
    },

    isTrue(val) {
        if (val === true) return true;
        if (typeof val === 'string') {
            const s = val.trim().toLowerCase();
            return s === 'true' || s === 'yes' || s === '1';
        }
        return false;
    },

    filterDeactivated(rows, headers) {
        const deactivateIndex = headers.indexOf('Deactivate?');
        if (deactivateIndex === -1) return rows;
        
        return rows.filter(row => !this.isTrue(row[deactivateIndex]));
    }
};