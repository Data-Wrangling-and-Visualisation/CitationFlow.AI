// Function to load content dynamically
function loadContent(page) {
    const contentDiv = document.getElementById('content');
    contentDiv.innerHTML = ''; // Clear previous content

    if (page === '/graph') {
        // Load graph content
        const script = document.createElement('script');
        script.src = 'graph.js';
        script.type = 'module';
        contentDiv.appendChild(script);
        contentDiv.innerHTML += '<div id="graph-container"><div id="graph"></div></div>';
    } else if (page === '/stats') {
        // Load stats content
        const script = document.createElement('script');
        script.src = 'stats.js';
        script.type = 'module';
        contentDiv.appendChild(script);
        contentDiv.innerHTML += '<div id="stats-container"></div>';
    } else if (page === '/about') {
        // Load about content
        contentDiv.innerHTML = `
            <h1>About Page</h1>
            <p>This is a simple static page with some text.</p>
        `;
    } else {
        // Default content
        contentDiv.innerHTML = '<p>Page not found.</p>';
    }
}

// Update the URL and load content
function navigateTo(page) {
    history.pushState({}, '', page); // Update URL without reloading
    loadContent(page); // Load content for the new page
}

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
    loadContent(window.location.pathname); // Load content based on the current URL
});

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Set up button listeners
    document.getElementById('graph-button').addEventListener('click', () => navigateTo('/graph'));
    document.getElementById('stats-button').addEventListener('click', () => navigateTo('/stats'));
    document.getElementById('about-button').addEventListener('click', () => navigateTo('/about'));

    // Load content based on the initial URL
    loadContent(window.location.pathname || '/graph'); // Default to /graph if no path is set
});