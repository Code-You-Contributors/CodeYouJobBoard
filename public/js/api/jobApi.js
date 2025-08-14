const JobAPI = {
    async fetchJobData() {
        try {
            const response = await fetch('/api/sheet');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log('Successfully fetched data from API');
            console.log(`Total columns: ${data.values ? data.values.length : 0}`);
            console.log(`Total rows: ${data.values && data.values[0] ? data.values[0].length - 1 : 0}`);
            return data;
        } catch (error) {
            console.error('Error fetching job data:', error);
            return null;
        }
    }
};