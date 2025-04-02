/**
 * Hostoweb Website Screenshot Tool
 * JavaScript functionality for capturing website screenshots
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const urlInput = document.getElementById('url-input');
    const captureBtn = document.getElementById('capture-btn');
    const deviceSelect = document.getElementById('device-select');
    const fullpageSelect = document.getElementById('fullpage-select');
    const formatSelect = document.getElementById('format-select');
    const delaySelect = document.getElementById('delay-select');
    const downloadBtn = document.getElementById('download-btn');
    const newBtn = document.getElementById('new-btn');
    const screenshotContainer = document.getElementById('screenshot-container');
    const screenshotUrl = document.getElementById('screenshot-url');
    const screenshotImage = document.getElementById('screenshot-image');
    const loader = document.querySelector('.loader');
    const errorMsg = document.getElementById('error-msg');
    
    // Device dimensions for simulation
    const deviceDimensions = {
        desktop: { width: 1920, height: 1080 },
        laptop: { width: 1366, height: 768 },
        tablet: { width: 768, height: 1024 },
        mobile: { width: 375, height: 667 }
    };
    
    // Terminal-style typing animation
    function simulateTyping(element, text, speed = 50) {
        let i = 0;
        element.textContent = '';
        const typeInterval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typeInterval);
            }
        }, speed);
    }
    
    // Handle capture button click
    captureBtn.addEventListener('click', captureScreenshot);
    
    // Handle download button click
    downloadBtn.addEventListener('click', downloadScreenshot);
    
    // Handle new screenshot button click
    newBtn.addEventListener('click', function() {
        screenshotContainer.classList.remove('show');
    });
    
    // Handle Enter key press
    urlInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            captureScreenshot();
        }
    });
    
    /**
     * Initiates screenshot capture process
     */
    function captureScreenshot() {
        let url = urlInput.value.trim();
        
        // Add https:// if not provided
        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
            urlInput.value = url;
        }
        
        if (!url) {
            showError('Please enter a valid URL');
            return;
        }
        
        // Hide previous results and error messages
        screenshotContainer.classList.remove('show');
        errorMsg.classList.remove('show');
        
        // Get selected options
        const device = deviceSelect.value;
        const fullpage = fullpageSelect.value === 'fullpage';
        const format = formatSelect.value;
        const delay = delaySelect.value;
        
        // Update loader text and show loader
        const loaderText = document.querySelector('.loader-text');
        simulateTyping(loaderText, `Capturing ${device} screenshot of ${url}...`);
        loader.classList.add('show');
        
        // In a production environment, you would call a screenshot API
        // Example API URLs:
        // - https://api.screenshotapi.net/capture?apikey=YOUR_API_KEY&url=${encodeURIComponent(url)}&width=${deviceDimensions[device].width}&height=${deviceDimensions[device].height}&output=${format}&full_page=${fullpage}&delay=${delay}
        // - https://api.urlbox.io/v1/${YOUR_API_KEY}/png?url=${encodeURIComponent(url)}&width=${deviceDimensions[device].width}&height=${deviceDimensions[device].height}&format=${format}&full_page=${fullpage}&delay=${delay * 1000}
        
        // For this demo, we'll simulate the API call
        setTimeout(() => {
            generateMockScreenshot(url, device, format);
        }, 2000); // Simulate API delay
    }
    
    /**
     * Generates a mock screenshot (for demo purposes)
     * In production, this would be replaced with a real API call
     */
    function generateMockScreenshot(url, device, format) {
        // In a real implementation, this would use an actual screenshot API
        // For demo, we'll create a placeholder image indicating the device size
        
        try {
            // Extract domain from URL for display
            const domain = new URL(url).hostname;
            screenshotUrl.textContent = domain;
            
            // Display a placeholder image for demo purposes
            // In production, this would be the actual screenshot from the API
            
            const deviceSize = deviceDimensions[device];
            
            // For demonstration, use a placeholder image
            // In production, this would be the URL returned by the screenshot API
            const placeholderUrl = `/api/placeholder/${deviceSize.width}/${deviceSize.height}`;
            
            screenshotImage.src = placeholderUrl;
            screenshotImage.alt = `Screenshot of ${domain} (${device})`;
            
            // Store the original URL and device for download purposes
            screenshotImage.dataset.url = url;
            screenshotImage.dataset.device = device;
            screenshotImage.dataset.format = format;
            
            // Hide loader and show screenshot
            loader.classList.remove('show');
            screenshotContainer.classList.add('show');
            
        } catch (error) {
            console.error('Error generating screenshot:', error);
            showError('Failed to capture screenshot. Please check the URL and try again.');
            loader.classList.remove('show');
        }
    }
    
    /**
     * Handles screenshot download
     * In production, this would download the actual image from the API
     */
    function downloadScreenshot() {
        if (!screenshotContainer.classList.contains('show')) {
            return;
        }
        
        const url = screenshotImage.dataset.url;
        const device = screenshotImage.dataset.device;
        const format = screenshotImage.dataset.format;
        
        try {
            // Extract domain from URL for filename
            const domain = new URL(url).hostname;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${domain}-${device}-${timestamp}.${format}`;
            
            // In a real implementation, this would create a download link to the actual screenshot
            // For demo purposes, we'll use the placeholder image
            
            // Create a link element
            const downloadLink = document.createElement('a');
            downloadLink.href = screenshotImage.src;
            downloadLink.download = filename;
            
            // Simulate click to trigger download
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
        } catch (error) {
            console.error('Error downloading screenshot:', error);
            showError('Failed to download screenshot. Please try again.');
        }
    }
    
    /**
     * Shows error message
     */
    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.add('show');
        screenshotContainer.classList.remove('show');
        loader.classList.remove('show');
    }
});
