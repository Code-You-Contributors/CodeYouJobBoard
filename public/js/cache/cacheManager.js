const CacheManager = {
    STORAGE_KEY: 'codeyou_job_data',
    TIMESTAMP_KEY: 'codeyou_job_data_timestamp',
    CACHE_DURATION: 0.5 * 60 * 1000,

    store(data) {
        try {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            sessionStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
            console.log('Job data cached successfully');
        } catch (error) {
            console.error('Error storing job data:', error);
        }
    },

    get() {
        try {
            const timestamp = sessionStorage.getItem(this.TIMESTAMP_KEY);
            const data = sessionStorage.getItem(this.STORAGE_KEY);

            if (!timestamp || !data) return null;

            const age = Date.now() - parseInt(timestamp);
            if (age > this.CACHE_DURATION) {
                console.log('Cache expired');
                this.clear();
                return null;
            }

            console.log(`Using cached data (${Math.round(age / 1000)} seconds old)`);
            return JSON.parse(data);
        } catch (error) {
            console.error('Error retrieving cached data:', error);
            return null;
        }
    },

    clear() {
        sessionStorage.removeItem(this.STORAGE_KEY);
        sessionStorage.removeItem(this.TIMESTAMP_KEY);
        console.log('Cache cleared');
    }
};