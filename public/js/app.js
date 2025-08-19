document.addEventListener('DOMContentLoaded', () => {
    JobController.init();
});

// Making `JobController` available globally for debugging
if (typeof window !== 'undefined') {
    window.JobController = JobController;
}