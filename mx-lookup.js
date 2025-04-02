/**
 * Hostoweb MX Lookup Tool
 * JavaScript functionality for looking up mail exchange records
 * Uses a fallback to mock data if API calls fail due to CORS
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
    const summaryText = document.getElementById('summary-text');
    const mailSecurityRecords = document.getElementById('mail-security-records');
    const loader = document.querySelector('.loader');
    const errorMsg = document.getElementById('error-msg');
    
    // Current domain being checked
    let currentDomain = '';

    // Mock data for common email providers (for fallback)
    const mockData = {
        'gmail.com': {
            mx: [
                { priority: 10, server: 'alt1.gmail-smtp-in.l.google.com', ttl: 3600 },
                { priority: 20, server: 'alt2.gmail-smtp-in.l.google.com', ttl: 3600 },
                { priority: 30, server: 'alt3.gmail-smtp-in.l.google.com', ttl: 3600 },
                { priority: 40, server: 'alt4.gmail-smtp-in.l.google.com', ttl: 3600 }
            ],
            spf: 'v=spf1 include:_spf.google.com ~all',
            dmarc: 'v=DMARC1; p=none; sp=quarantine; rua=mailto:mailauth-reports@google.com',
            dkim: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...truncated...'
        },
        'yahoo.com': {
            mx: [
                { priority: 1, server: 'mta5.am0.yahoodns.net', ttl: 1800 },
                { priority: 1, server: 'mta6.am0.yahoodns.net', ttl: 1800 },
                { priority: 1, server: 'mta7.am0.yahoodns.net', ttl: 1800 }
            ],
            spf: 'v=spf1 include:_spf.mail.yahoo.com include:_spf.msg.yahoo.com ~all',
            dmarc: 'v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-yahoo-rua@yahoo-inc.com',
            dkim: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB...truncated...'
        },
        'outlook.com': {
            mx: [
                { priority: 10, server: 'outlook-com.olc.protection.outlook.com', ttl: 3600 }
            ],
            spf: 'v=spf1 include:spf.protection.outlook.com -all',
            dmarc: 'v=DMARC1; p=quarantine; pct=100; rua=mailto:d@rua.agari.com',
            dkim: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...truncated...'
        },
        'default': {
            mx: [
                { priority: 10, server: 'mail.hostoweb.com', ttl: 3600 },
                { priority: 20, server: 'mail-backup.hostoweb.com', ttl: 3600 }
            ],
            spf: 'v=spf1 include:hostoweb.com ~all',
            dmarc: 'v=DMARC1; p=none; rua=mailto:dmarc@hostoweb.com',
            dkim: 'v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQ...'
        }
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
    
    // Handle lookup button click
    lookupBtn.addEventListener('click', lookupMXRecords);
    
    // Handle refresh button click
    refreshBtn.addEventListener('click', lookupMXRecords);
    
    // Handle copy button click
    copyBtn.addEventListener('click', copyResults);
    
    // Handle Enter key press
    domainInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            lookupMXRecords();
        }
    });
    
    /**
     * Initiates MX record lookup
     */
    function lookupMXRecords() {
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
        simulateTyping(loaderText, `Looking up MX records for ${domain}...`);
        loader.classList.add('show');
        
        // Update domain name in results heading
        resultsDomain.textContent = domain;
        
        // Clear previous results
        resultsBody.innerHTML = '';
        mailSecurityRecords.innerHTML = '';
        
        // First try with real API
        tryLookupWithAPI(domain)
            .catch(error => {
                console.warn('API lookup failed:', error);
                // Fall back to mock data if API fails
                displayMockData(domain);
            });
    }
    
    /**
     * Tries to perform a real lookup using DNS API
     */
    async function tryLookupWithAPI(domain) {
        // Using Google's DNS-over-HTTPS API for the lookup
        const apiUrl = `https://dns.google/resolve?name=${domain}&type=MX`;
        
        // Set timeout for fetch operation
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
            const response = await fetch(apiUrl, { 
                signal: controller.signal,
                mode: 'cors' // This might not work due to CORS restrictions
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            
            // Process MX records
            processMXRecords(domain, data);
            
            // Also fetch TXT records for SPF, DKIM, and DMARC
            return fetchMailSecurityRecords(domain);
        } 
        catch (error) {
            clearTimeout(timeoutId);
            
            // If it's a CORS error or any other error, throw it to trigger fallback
            throw error;
        }
    }
    
    /**
     * Displays mock data for demonstration purposes
     */
    function displayMockData(domain) {
        console.log('Using mock data for demonstration');
        
        // Check if we have mock data for this specific domain
        let mockEntry = mockData[domain.toLowerCase()];
        
        // If not, use a default or generate one
        if (!mockEntry) {
            // Check if it's a subdomain of a domain we know
            const parts = domain.split('.');
            if (parts.length > 2) {
                const parentDomain = parts.slice(parts.length - 2).join('.');
                mockEntry = mockData[parentDomain.toLowerCase()];
            }
            
            // If still not found, use default
            if (!mockEntry) {
                mockEntry = mockData['default'];
            }
        }
        
        // Display MX records
        mockEntry.mx.forEach(record => {
            const row = document.createElement('tr');
            
            // Priority cell
            const priorityCell = document.createElement('td');
            priorityCell.textContent = record.priority;
            row.appendChild(priorityCell);
            
            // Server cell
            const serverCell = document.createElement('td');
            serverCell.textContent = record.server;
            row.appendChild(serverCell);
            
            // TTL cell
            const ttlCell = document.createElement('td');
            ttlCell.textContent = record.ttl + 's';
            row.appendChild(ttlCell);
            
            resultsBody.appendChild(row);
        });
        
        // Update summary
        updateMXSummary(mockEntry.mx);
        
        // Display security records
        addSecurityRecordToUI('SPF', mockEntry.spf, 'Specifies which servers can send email from this domain');
        addSecurityRecordToUI('DMARC', mockEntry.dmarc, 'Tells receiving servers how to handle emails that fail authentication');
        addSecurityRecordToUI('DKIM', mockEntry.dkim, 'Digital signature that validates email was sent from your domain');
        
        // Hide loader and show results
        loader.classList.remove('show');
        resultsContainer.classList.add('show');
    }
    
    /**
     * Processes MX records from the API response
     */
    function processMXRecords(domain, data) {
        if (data.Status === 0 && data.Answer && data.Answer.length > 0) { // 0 means success in DNS response codes
            // Filter for MX records
            const mxRecords = data.Answer.filter(record => record.type === 15); // 15 is the type code for MX
            
            if (mxRecords.length > 0) {
                // Sort by priority (lower values first)
                mxRecords.sort((a, b) => {
                    const priorityA = parseInt(a.data.split(' ')[0]);
                    const priorityB = parseInt(b.data.split(' ')[0]);
                    return priorityA - priorityB;
                });
                
                // Display each MX record
                mxRecords.forEach(record => {
                    const parts = record.data.split(' ');
                    const priority = parts[0];
                    const server = parts.slice(1).join(' ');
                    
                    const row = document.createElement('tr');
                    
                    // Priority cell
                    const priorityCell = document.createElement('td');
                    priorityCell.textContent = priority;
                    row.appendChild(priorityCell);
                    
                    // Server cell
                    const serverCell = document.createElement('td');
                    serverCell.textContent = server;
                    row.appendChild(serverCell);
                    
                    // TTL cell
                    const ttlCell = document.createElement('td');
                    ttlCell.textContent = record.TTL + 's';
                    row.appendChild(ttlCell);
                    
                    resultsBody.appendChild(row);
                });
                
                // Update summary
                updateMXSummary(mxRecords);
                
                // Show results
                resultsContainer.classList.add('show');
            } else {
                showError(`No MX records found for ${domain}`);
            }
        } else {
            if (data.Status !== 0) {
                showError(`DNS lookup failed with status code: ${data.Status}`);
            } else {
                showError(`No MX records found for ${domain}`);
            }
        }
        
        // Hide loader
        loader.classList.remove('show');
    }
    
    /**
     * Updates the MX summary based on the records found
     */
    function updateMXSummary(mxRecords) {
        // For standard API response
        if (mxRecords[0] && mxRecords[0].data) {
            // Convert to standardized format
            mxRecords = mxRecords.map(record => {
                const parts = record.data.split(' ');
                return {
                    priority: parseInt(parts[0]),
                    server: parts.slice(1).join(' ')
                };
            });
        }
        
        // Check if there are multiple MX records
        const recordCount = mxRecords.length;
        
        // Check if priorities are properly configured (lower is higher priority)
        const priorities = mxRecords.map(record => record.priority || parseInt(record.data?.split(' ')[0]));
        const hasPriorities = new Set(priorities).size > 1;
        
        // Check if there's a clear primary server (priority 10 or lower)
        const hasLowPriority = priorities.some(p => p <= 10);
        
        // Generate summary text
        let summary = `This domain has ${recordCount} mail server${recordCount !== 1 ? 's' : ''} configured.`;
        
        if (recordCount === 0) {
            summary = `No mail servers configured for this domain. Email cannot be delivered.`;
        } else if (recordCount === 1) {
            summary = `This domain has 1 mail server configured. No backup MX records found.`;
        } else if (recordCount > 1 && hasPriorities) {
            summary = `This domain has ${recordCount} mail servers configured with proper priorities.`;
        } else if (recordCount > 1 && !hasPriorities) {
            summary = `This domain has ${recordCount} mail servers but they have the same priority. This is not ideal for failover.`;
        }
        
        // Set the summary text
        summaryText.textContent = summary;
    }
    
    /**
     * Fetches TXT records for SPF, DKIM, and DMARC
     */
    async function fetchMailSecurityRecords(domain) {
        try {
            // Array of promises for fetching different TXT records
            const promises = [
                // SPF record (domain itself)
                fetch(`https://dns.google/resolve?name=${domain}&type=TXT`),
                
                // DMARC record
                fetch(`https://dns.google/resolve?name=_dmarc.${domain}&type=TXT`),
                
                // Common DKIM selector (optional, can add more)
                fetch(`https://dns.google/resolve?name=default._domainkey.${domain}&type=TXT`)
            ];
            
            const results = await Promise.all(promises.map(p => p.catch(e => ({ error: e }))));
            
            const parsedResults = await Promise.all(results.map(response => {
                if (response.error) return { error: response.error };
                if (!response.ok) return { error: new Error('Network response was not ok') };
                return response.json();
            }));
            
            displayMailSecurityRecords(domain, parsedResults[0], parsedResults[1], parsedResults[2]);
        }
        catch (error) {
            console.error('Error fetching mail security records:', error);
            // Still show MX results even if security records fail
            resultsContainer.classList.add('show');
        }
    }
    
    /**
     * Displays mail security records (SPF, DKIM, DMARC)
     */
    function displayMailSecurityRecords(domain, spfData, dmarcData, dkimData) {
        mailSecurityRecords.innerHTML = '';
        
        // Process SPF
        const spfRecord = findSecurityRecord(spfData, 'v=spf1');
        addSecurityRecordToUI('SPF', spfRecord, 'Specifies which servers can send email from this domain');
        
        // Process DMARC
        const dmarcRecord = findSecurityRecord(dmarcData, 'v=DMARC1');
        addSecurityRecordToUI('DMARC', dmarcRecord, 'Tells receiving servers how to handle emails that fail authentication');
        
        // Process DKIM
        const dkimRecord = findSecurityRecord(dkimData, 'v=DKIM1');
        addSecurityRecordToUI('DKIM', dkimRecord, 'Digital signature that validates email was sent from your domain');
        
        // Ensure results are shown
        resultsContainer.classList.add('show');
    }
    
    /**
     * Finds security record with specific prefix in DNS data
     */
    function findSecurityRecord(data, prefix) {
        if (!data || data.error || data.Status !== 0 || !data.Answer) {
            return null;
        }
        
        // Find TXT record that starts with the specific prefix
        const record = data.Answer.find(record => {
            return record.type === 16 && // Type 16 is TXT
                record.data.includes(prefix);
        });
        
        return record ? record.data.replace(/^"|"$/g, '') : null;
    }
    
    /**
     * Adds a security record to the UI
     */
    function addSecurityRecordToUI(name, record, description) {
        const recordDiv = document.createElement('div');
        recordDiv.className = 'security-record';
        
        const recordTitle = document.createElement('h4');
        recordTitle.innerHTML = `${name} Record ${record ? '<span class="status-indicator status-propagated"></span>' : '<span class="status-indicator status-not-propagated"></span>'}`;
        
        const recordDesc = document.createElement('p');
        recordDesc.className = 'record-description';
        recordDesc.textContent = description;
        
        recordDiv.appendChild(recordTitle);
        recordDiv.appendChild(recordDesc);
        
        if (record) {
            const recordValue = document.createElement('pre');
            recordValue.className = 'record-value';
            recordValue.textContent = record;
            recordDiv.appendChild(recordValue);
        } else {
            const recordMissing = document.createElement('p');
            recordMissing.className = 'record-missing';
            recordMissing.textContent = `No ${name} record found.`;
            recordDiv.appendChild(recordMissing);
        }
        
        mailSecurityRecords.appendChild(recordDiv);
    }
    
    /**
     * Copies results to clipboard
     */
    function copyResults() {
        if (!resultsContainer.classList.contains('show')) {
            return;
        }
        
        let copyText = `MX Records for: ${resultsDomain.textContent}\n\n`;
        copyText += `${summaryText.textContent}\n\n`;
        
        // Get all MX table rows
        const rows = document.querySelectorAll('#results-body tr');
        
        if (rows.length > 0) {
            copyText += `Mail Servers:\n`;
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                copyText += `Priority: ${cells[0].textContent}, Server: ${cells[1].textContent}, TTL: ${cells[2].textContent}\n`;
            });
            copyText += `\n`;
        }
        
        // Get all security records
        const securityRecords = document.querySelectorAll('.security-record');
        
        if (securityRecords.length > 0) {
            copyText += `Email Authentication Records:\n`;
            securityRecords.forEach(record => {
                const title = record.querySelector('h4').textContent.replace(/[▮▯]/g, '').trim();
                const value = record.querySelector('.record-value')?.textContent || 'Not configured';
                copyText += `${title}: ${value}\n\n`;
            });
        }
        
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
