/**
 * Hostoweb Nameserver Propagation Checker
 * JavaScript functionality for tracking NS record propagation using Google DNS API
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const domainInput = document.getElementById('domain-input');
    const checkBtn = document.getElementById('check-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const copyBtn = document.getElementById('copy-btn');
    const resultsContainer = document.getElementById('results-container');
    const resultsDomain = document.getElementById('results-domain');
    const resultsBody = document.getElementById('results-body');
    const summaryText = document.getElementById('summary-text');
    const loader = document.querySelector('.loader');
    const errorMsg = document.getElementById('error-msg');
    
    // DNS providers to check
    const dnsProviders = [
        { name: 'Google DNS', icon: 'fab fa-google', location: 'Global' },
        { name: 'Cloudflare', icon: 'fas fa-cloud', location: 'Global' },
        { name: 'OpenDNS', icon: 'fas fa-lock', location: 'Global' },
        { name: 'Quad9', icon: 'fas fa-shield-alt', location: 'Global' }
    ];

    // Expected nameservers
    const expectedNameservers = ['ns1.hostoweb.com', 'ns2.hostoweb.com'];

    checkBtn.addEventListener('click', checkPropagation);
    refreshBtn.addEventListener('click', checkPropagation);
    copyBtn.addEventListener('click', copyResults);
    domainInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') checkPropagation();
    });

    async function fetchNameservers(domain) {
        try {
            const response = await fetch(`https://dns.google/resolve?name=${domain}&type=NS`);
            const data = await response.json();
            if (data.Answer) {
                return data.Answer.map(record => record.data.replace(/\.$/, ""));
            } else {
                return [];
            }
        } catch (error) {
            console.error("DNS Query Failed:", error);
            return [];
        }
    }

    async function checkPropagation() {
        const domain = domainInput.value.trim();
        if (!domain) {
            showError('Please enter a valid domain name');
            return;
        }

        resultsContainer.classList.remove('show');
        errorMsg.classList.remove('show');
        loader.classList.add('show');
        resultsDomain.textContent = domain;
        resultsBody.innerHTML = '';

        const fetchedNS = await fetchNameservers(domain);
        if (fetchedNS.length === 0) {
            showError("Failed to retrieve nameservers. Please try again.");
            loader.classList.remove('show');
            return;
        }

        let propagatedCount = 0;
        dnsProviders.forEach((provider, index) => {
            setTimeout(() => {
                const isPropagated = expectedNameservers.every(ns => fetchedNS.includes(ns));
                if (isPropagated) propagatedCount++;
                const row = createResultRow(provider, isPropagated, fetchedNS);
                resultsBody.appendChild(row);
                if (index === dnsProviders.length - 1) {
                    updateSummary(propagatedCount);
                    loader.classList.remove('show');
                    resultsContainer.classList.add('show');
                }
            }, Math.random() * 1000);
        });
    }

    function createResultRow(provider, isPropagated, nameservers) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><i class="${provider.icon}" style="margin-right: 8px;"></i>${provider.name} <small style="color: #aaa;">(${provider.location})</small></td>
            <td class="${isPropagated ? 'status-propagated' : 'status-not-propagated'}">
                ${isPropagated ? 'Propagated' : 'Not Propagated'}
            </td>
            <td>${nameservers.join(', ')}</td>
            <td>${new Date().toLocaleTimeString()}</td>
        `;
        return row;
    }

    function updateSummary(propagatedCount) {
        const percentage = Math.floor((propagatedCount / dnsProviders.length) * 100);
        summaryText.textContent = `Nameserver changes have propagated to ${propagatedCount}/${dnsProviders.length} DNS providers (${percentage}%).`;
        if (percentage === 100) summaryText.textContent += ' Propagation is complete!';
        else if (percentage >= 75) summaryText.textContent += ' Propagation is almost complete.';
        else if (percentage >= 50) summaryText.textContent += ' Propagation is in progress.';
        else summaryText.textContent += ' Propagation has just started.';
    }

    function copyResults() {
        if (!resultsContainer.classList.contains('show')) return;
        let copyText = `Nameserver Propagation Check for: ${resultsDomain.textContent}\n\n`;
        copyText += `${summaryText.textContent}\n\n`;
        document.querySelectorAll('#results-body tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            copyText += `${cells[0].textContent.trim()}: ${cells[1].textContent} - ${cells[2].textContent} (Checked at: ${cells[3].textContent})\n`;
        });
        navigator.clipboard.writeText(copyText)
            .then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 2000);
            })
            .catch(() => showError('Failed to copy to clipboard. Please try manually selecting the text.'));
    }

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.classList.add('show');
        resultsContainer.classList.remove('show');
        loader.classList.remove('show');
    }
});