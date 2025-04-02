/**
 * Hostoweb DNS Lookup Tool
 * JavaScript functionality for DNS lookup operations
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const domainInput = document.getElementById('domain-input');
    const lookupBtn = document.getElementById('lookup-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const copyBtn = document.getElementById('copy-btn');
    const resultsContainer = document.getElementById('results-container');
    const resultsDomain = document.getElementById('results-domain');
    const resultsBody = document.getElementById('results-body');
    const recordTypes = document.querySelectorAll('.record-type');
    const loader = document.querySelector('.loader');
    const errorMsg = document.getElementById('error-msg');
    
    // Current state
    let selectedType = 'A';
    let currentDomain = '';
    
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
    
    // Handle record type selection
    recordTypes.forEach(type => {
        type.addEventListener('click', function() {
            recordTypes.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            selectedType = this.dataset.type;
            
            // If results are already showing, perform a new lookup
            if (resultsContainer.classList.contains('show') && currentDomain) {
                performLookup();
            }
        });
    });
    
    // Handle lookup button click
    lookupBtn.addEventListener('click', performLookup);
    
    // Handle refresh button click
    refreshBtn.addEventListener('click', performLookup);
    
    // Handle copy button click
    copyBtn.addEventListener('click', copyResults);
    
    // Handle Enter key press
    domainInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performLookup();
        }
    });
    
    /**
     * Performs DNS lookup for the entered domain
     */
    function performLookup() {
        const domain = domainInput.value.trim();
        currentDomain = domain;
        
        if (!domain) {
            showError('Please enter a valid domain name');
            return;
        }
        
        // Hide previous results and error messages
        resultsContainer.classList.remove('show');
        errorMsg.classList.remove('show');
        
        // Update loader text and show loader
        const loaderText = document.querySelector('.loader-text');
        simulateTyping(loaderText, `Querying ${selectedType} records for ${domain}...`);
        loader.classList.add('show');
        
        // Using Google's DNS-over-HTTPS API for the lookup
        const apiUrl = `https://dns.google/resolve?name=${domain}&type=${selectedType}`;

        
        // Fetch with timeout to handle slow responses
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        Promise.race([
            fetch(apiUrl),
            timeoutPromise
        ])
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Hide loader
                loader.classList.remove('show');
                
                if (data.Status === 0) { // 0 means success in DNS response codes
                    displayResults(domain, data);
                } else {
                    showError(`DNS lookup failed with status code: ${data.Status}`);
                }
            })
            .catch(error => {
                // Hide loader
                loader.classList.remove('show');
                showError('Failed to perform DNS lookup. Please check your connection and try again.');
                console.error('Error:', error);
            });
    }
    
    /**
     * Displays the DNS lookup results in the table
     */
    function displayResults(domain, data) {
        // Clear previous results
        resultsBody.innerHTML = '';
        
        // Update domain name in results heading
        resultsDomain.textContent = domain;
        
        // Process the answers
        if (data.Answer && data.Answer.length > 0) {
            data.Answer.forEach(record => {
                const row = document.createElement('tr');
                
                // Create type cell
                const typeCell = document.createElement('td');
                typeCell.textContent = getRecordTypeName(record.type);
                row.appendChild(typeCell);
                
                // Create value cell
                const valueCell = document.createElement('td');
                valueCell.textContent = formatRecordData(record.type, record.data);
                row.appendChild(valueCell);
                
                // Create TTL cell
                const ttlCell = document.createElement('td');
                ttlCell.textContent = record.TTL + 's';
                row.appendChild(ttlCell);
                
                resultsBody.appendChild(row);
            });
            
            // Show results
            resultsContainer.classList.add('show');
        } else {
            showError(`No ${selectedType} records found for ${domain}`);
        }
    }
    
    /**
     * Converts DNS record type codes to human-readable names
     */
    function getRecordTypeName(typeCode) {
        const types = {
            1: 'A',
            2: 'NS',
            5: 'CNAME',
            6: 'SOA',
            15: 'MX',
            16: 'TXT',
            28: 'AAAA',
            257: 'CAA'
        };
        
        return types[typeCode] || `Type ${typeCode}`;
    }
    
    /**
     * Formats record data based on record type
     */
    function formatRecordData(type, data) {
        // For MX records, format as "priority mail.example.com"
        if (type === 15) { // MX
            const parts = data.split(' ');
            if (parts.length >= 2) {
                return `${parts[0]} ${parts.slice(1).join(' ')}`;
            }
        }
        
        // For TXT records, remove quotes if present
        if (type === 16) { // TXT
            return data.replace(/^"(.*)"$/, '$1');
        }
        
        return data;
    }
    
    /**
     * Copies results to clipboard
     */
    function copyResults() {
        if (!resultsContainer.classList.contains('show')) {
            return;
        }
        
        let copyText = `DNS Records for: ${resultsDomain.textContent}\n\n`;
        
        // Get all table rows
        const rows = document.querySelectorAll('#results-body tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            copyText += `${cells[0].textContent}: ${cells[1].textContent} (TTL: ${cells[2].textContent})\n`;
        });
        
        // Copy to clipboard
        navigator.clipboard.writeText(copyText)
            .then(() => {
                // Temporarily change the copy button text
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                }, 2000);
            })
                        .catch(err => {
                console.error('Error copying to clipboard:', err);
                showError('Failed to copy to clipboard. Please try manually selecting the text.');
            });
    }
    
    /**
     * Shows error message
     */
    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.add('show');
        resultsContainer.classList.remove('show');
        loader.classList.remove('show');
    }
});