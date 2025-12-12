// ============================================================================
// JIGGY CAPITAL ANALYZE - FINANCIAL VISUALIZATION DASHBOARD
// ============================================================================

// Configuration
const ANALYZE_CONFIG = {
    GOOGLE_SHEETS: {
        positionsDetailedUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=1134366200',
        watchlistDetailedUrl: 'https://docs.google.com/spreadsheets/d/1xmD_h2_1I-kJkh-MsNUhxXMV7WDHrAlClj1Uq5jLcFE/export?format=csv&gid=695255397'
    }
};

// Global State
const analyzeState = {
    currentDataset: 'holdings', // 'holdings' or 'watchlist'
    rawData: null,
    parsedData: [],
    columns: [],
    visibleColumns: [],
    sortColumn: null,
    sortDirection: 'asc',
    chart: null,
    chartConfig: {
        type: 'line',
        xAxis: null,
        yAxisMetrics: [],
        timeRange: 'all'
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeAnalyzePage();
});

// Navigation functionality
function initializeNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (hamburger) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    });
}

// Initialize Analyze Page
async function initializeAnalyzePage() {
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    await loadAnalyzeData();
}

// Set up all event listeners
function setupEventListeners() {
    // Dataset selector
    const datasetSelector = document.getElementById('dataset-selector');
    if (datasetSelector) {
        datasetSelector.addEventListener('change', async (e) => {
            analyzeState.currentDataset = e.target.value;
            await loadAnalyzeData();
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.querySelector('i').classList.add('fa-spin');
            await loadAnalyzeData();
            setTimeout(() => {
                refreshBtn.querySelector('i').classList.remove('fa-spin');
            }, 500);
        });
    }
    
    // Column settings
    const columnSettingsBtn = document.getElementById('column-settings-btn');
    const columnSettingsPanel = document.getElementById('column-settings-panel');
    const closeColumnSettings = document.getElementById('close-column-settings');
    
    if (columnSettingsBtn && columnSettingsPanel) {
        columnSettingsBtn.addEventListener('click', () => {
            columnSettingsPanel.style.display = columnSettingsPanel.style.display === 'none' ? 'block' : 'none';
            if (columnSettingsPanel.style.display === 'block') {
                populateColumnSettings();
            }
        });
    }
    
    if (closeColumnSettings) {
        closeColumnSettings.addEventListener('click', () => {
            columnSettingsPanel.style.display = 'none';
        });
    }
    
    // Column settings actions
    const selectAllBtn = document.getElementById('select-all-columns');
    const deselectAllBtn = document.getElementById('deselect-all-columns');
    const resetColumnsBtn = document.getElementById('reset-columns');
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('#column-checkboxes input[type="checkbox"]').forEach(cb => {
                cb.checked = true;
            });
            updateVisibleColumns();
        });
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('#column-checkboxes input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
            updateVisibleColumns();
        });
    }
    
    if (resetColumnsBtn) {
        resetColumnsBtn.addEventListener('click', () => {
            resetToDefaultColumns();
        });
    }
    
    // Graph settings
    const graphSettingsBtn = document.getElementById('graph-settings-btn');
    const graphSettingsPanel = document.getElementById('graph-settings-panel');
    const closeGraphSettings = document.getElementById('close-graph-settings');
    
    if (graphSettingsBtn && graphSettingsPanel) {
        graphSettingsBtn.addEventListener('click', () => {
            graphSettingsPanel.style.display = graphSettingsPanel.style.display === 'none' ? 'block' : 'none';
            if (graphSettingsPanel.style.display === 'block') {
                populateGraphSettings();
            }
        });
    }
    
    if (closeGraphSettings) {
        closeGraphSettings.addEventListener('click', () => {
            graphSettingsPanel.style.display = 'none';
        });
    }
    
    // Apply graph settings
    const applyGraphSettings = document.getElementById('apply-graph-settings');
    if (applyGraphSettings) {
        applyGraphSettings.addEventListener('click', () => {
            applyGraphConfiguration();
        });
    }
    
    // Export buttons
    const exportTableBtn = document.getElementById('export-table-btn');
    const exportGraphBtn = document.getElementById('export-graph-btn');
    
    if (exportTableBtn) {
        exportTableBtn.addEventListener('click', () => {
            exportTable();
        });
    }
    
    if (exportGraphBtn) {
        exportGraphBtn.addEventListener('click', () => {
            exportGraph();
        });
    }
}

// Load data from Google Sheets
async function loadAnalyzeData() {
    const loadingEl = document.getElementById('table-loading');
    const errorEl = document.getElementById('table-error');
    const tableWrapper = document.getElementById('data-table-wrapper');
    
    try {
        // Show loading
        if (loadingEl) loadingEl.style.display = 'flex';
        if (errorEl) errorEl.style.display = 'none';
        if (tableWrapper) tableWrapper.style.display = 'none';
        
        // Determine which URL to use
        const url = analyzeState.currentDataset === 'holdings' 
            ? ANALYZE_CONFIG.GOOGLE_SHEETS.positionsDetailedUrl
            : ANALYZE_CONFIG.GOOGLE_SHEETS.watchlistDetailedUrl;
        
        // Fetch data
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.statusText}`);
        }
        
        const csvText = await response.text();
        analyzeState.rawData = csvText;
        
        // Parse CSV data
        analyzeState.parsedData = parseDetailedCSV(csvText);
        
        // Extract columns
        if (analyzeState.parsedData.length > 0) {
            analyzeState.columns = Object.keys(analyzeState.parsedData[0]);
            // Set default visible columns (first 15 columns)
            if (analyzeState.visibleColumns.length === 0) {
                analyzeState.visibleColumns = analyzeState.columns.slice(0, 15);
            }
        }
        
        // Render table
        renderTable();
        
        // Hide loading, show table
        if (loadingEl) loadingEl.style.display = 'none';
        if (tableWrapper) tableWrapper.style.display = 'block';
        
    } catch (error) {
        console.error('Error loading analyze data:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'flex';
        if (tableWrapper) tableWrapper.style.display = 'none';
    }
}

// Parse detailed CSV with all columns
function parseDetailedCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    
    // Find data start (skip metadata rows)
    let dataStartIndex = 1;
    for (let i = 1; i < Math.min(10, lines.length); i++) {
        const firstCell = lines[i].split(',')[0].trim();
        // Look for first row that looks like a ticker (letters/numbers, not "General Information", etc.)
        if (firstCell && firstCell.length > 0 && firstCell.length < 10 && 
            !firstCell.includes('General') && !firstCell.includes('Information') &&
            !firstCell.includes('Median') && !firstCell.includes('Min') && !firstCell.includes('Max') &&
            !firstCell.includes('Sum')) {
            dataStartIndex = i;
            break;
        }
    }
    
    // Parse data rows
    const data = [];
    for (let i = dataStartIndex; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0 || !values[0] || values[0].trim() === '') continue;
        
        const row = {};
        headers.forEach((header, index) => {
            const value = values[index] || '';
            row[header] = value.trim();
        });
        data.push(row);
    }
    
    return data;
}

// Parse a CSV line handling quoted values
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    
    return values;
}

// Render the data table
function renderTable() {
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    
    if (!tableHeader || !tableBody) return;
    
    // Clear existing content
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    
    if (analyzeState.parsedData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="100%" style="text-align: center; padding: 2rem; color: #6b7280;">No data available</td></tr>';
        return;
    }
    
    // Create header row
    const headerRow = document.createElement('tr');
    analyzeState.visibleColumns.forEach(column => {
        const th = document.createElement('th');
        th.className = 'sortable';
        th.textContent = formatColumnName(column);
        th.dataset.column = column;
        th.addEventListener('click', () => sortTable(column));
        
        // Add sort indicator if this is the sorted column
        if (analyzeState.sortColumn === column) {
            th.classList.add(`sort-${analyzeState.sortDirection}`);
        }
        
        headerRow.appendChild(th);
    });
    tableHeader.appendChild(headerRow);
    
    // Create data rows
    const sortedData = getSortedData();
    sortedData.forEach(row => {
        const tr = document.createElement('tr');
        analyzeState.visibleColumns.forEach(column => {
            const td = document.createElement('td');
            const value = row[column] || '';
            td.textContent = formatCellValue(value);
            
            // Add formatting classes
            if (isNumeric(value)) {
                td.classList.add('number');
                const num = parseFloat(value);
                if (!isNaN(num)) {
                    if (num < 0) td.classList.add('negative');
                    else if (num > 0 && column.toLowerCase().includes('change') || 
                             column.toLowerCase().includes('growth') ||
                             column.toLowerCase().includes('%')) {
                        td.classList.add('positive');
                    }
                }
            }
            
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

// Format column name for display
function formatColumnName(column) {
    // Convert snake_case or camelCase to Title Case
    return column
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .trim();
}

// Format cell value for display
function formatCellValue(value) {
    if (!value || value === '') return '-';
    
    // Handle percentage values
    if (typeof value === 'string' && value.includes('%')) {
        return value;
    }
    
    // Handle numeric values
    const num = parseFloat(value);
    if (!isNaN(num)) {
        // Format large numbers
        if (Math.abs(num) >= 1e9) {
            return (num / 1e9).toFixed(2) + 'B';
        } else if (Math.abs(num) >= 1e6) {
            return (num / 1e6).toFixed(2) + 'M';
        } else if (Math.abs(num) >= 1e3) {
            return (num / 1e3).toFixed(2) + 'K';
        }
        // Format decimals
        if (num % 1 !== 0) {
            return num.toFixed(2);
        }
        return num.toString();
    }
    
    return value;
}

// Check if value is numeric
function isNumeric(value) {
    if (typeof value === 'number') return true;
    if (typeof value !== 'string') return false;
    return !isNaN(value) && !isNaN(parseFloat(value));
}

// Sort table
function sortTable(column) {
    if (analyzeState.sortColumn === column) {
        analyzeState.sortDirection = analyzeState.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        analyzeState.sortColumn = column;
        analyzeState.sortDirection = 'asc';
    }
    renderTable();
}

// Get sorted data
function getSortedData() {
    if (!analyzeState.sortColumn) {
        return [...analyzeState.parsedData];
    }
    
    const sorted = [...analyzeState.parsedData];
    sorted.sort((a, b) => {
        const aVal = a[analyzeState.sortColumn] || '';
        const bVal = b[analyzeState.sortColumn] || '';
        
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        
        // Try numeric comparison first
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return analyzeState.sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        // String comparison
        const comparison = aVal.toString().localeCompare(bVal.toString());
        return analyzeState.sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
}

// Populate column settings panel
function populateColumnSettings() {
    const checkboxesContainer = document.getElementById('column-checkboxes');
    if (!checkboxesContainer) return;
    
    checkboxesContainer.innerHTML = '';
    
    analyzeState.columns.forEach(column => {
        const item = document.createElement('div');
        item.className = 'column-checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `col-${column}`;
        checkbox.value = column;
        checkbox.checked = analyzeState.visibleColumns.includes(column);
        checkbox.addEventListener('change', updateVisibleColumns);
        
        const label = document.createElement('label');
        label.htmlFor = `col-${column}`;
        label.textContent = formatColumnName(column);
        
        item.appendChild(checkbox);
        item.appendChild(label);
        checkboxesContainer.appendChild(item);
    });
}

// Update visible columns based on checkboxes
function updateVisibleColumns() {
    const checkboxes = document.querySelectorAll('#column-checkboxes input[type="checkbox"]:checked');
    analyzeState.visibleColumns = Array.from(checkboxes).map(cb => cb.value);
    renderTable();
}

// Reset to default columns
function resetToDefaultColumns() {
    if (analyzeState.columns.length > 0) {
        analyzeState.visibleColumns = analyzeState.columns.slice(0, 15);
        populateColumnSettings();
        renderTable();
    }
}

// Populate graph settings
function populateGraphSettings() {
    // Populate X-axis options
    const xAxisSelect = document.getElementById('x-axis-select');
    if (xAxisSelect && analyzeState.columns.length > 0) {
        xAxisSelect.innerHTML = '';
        analyzeState.columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = formatColumnName(column);
            xAxisSelect.appendChild(option);
        });
        
        // Set default X-axis (first column, usually ticker)
        if (!analyzeState.chartConfig.xAxis) {
            analyzeState.chartConfig.xAxis = analyzeState.columns[0];
            xAxisSelect.value = analyzeState.columns[0];
        } else {
            xAxisSelect.value = analyzeState.chartConfig.xAxis;
        }
    }
    
    // Populate Y-axis metrics
    const yAxisContainer = document.getElementById('y-axis-checkboxes');
    if (yAxisContainer && analyzeState.columns.length > 0) {
        yAxisContainer.innerHTML = '';
        
        // Filter to numeric columns for Y-axis
        const numericColumns = analyzeState.columns.filter(col => {
            if (analyzeState.parsedData.length === 0) return false;
            const sampleValue = analyzeState.parsedData[0][col];
            return isNumeric(sampleValue);
        });
        
        numericColumns.forEach(column => {
            const item = document.createElement('div');
            item.className = 'metric-checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `metric-${column}`;
            checkbox.value = column;
            checkbox.checked = analyzeState.chartConfig.yAxisMetrics.includes(column);
            
            const label = document.createElement('label');
            label.htmlFor = `metric-${column}`;
            label.textContent = formatColumnName(column);
            
            item.appendChild(checkbox);
            item.appendChild(label);
            yAxisContainer.appendChild(item);
        });
    }
    
    // Set chart type
    const chartTypeSelect = document.getElementById('chart-type-select');
    if (chartTypeSelect) {
        chartTypeSelect.value = analyzeState.chartConfig.type;
    }
    
    // Set time range
    const timeRangeSelect = document.getElementById('time-range-select');
    if (timeRangeSelect) {
        timeRangeSelect.value = analyzeState.chartConfig.timeRange;
    }
}

// Apply graph configuration
function applyGraphConfiguration() {
    // Get chart type
    const chartTypeSelect = document.getElementById('chart-type-select');
    if (chartTypeSelect) {
        analyzeState.chartConfig.type = chartTypeSelect.value;
    }
    
    // Get X-axis
    const xAxisSelect = document.getElementById('x-axis-select');
    if (xAxisSelect) {
        analyzeState.chartConfig.xAxis = xAxisSelect.value;
    }
    
    // Get Y-axis metrics
    const yAxisCheckboxes = document.querySelectorAll('#y-axis-checkboxes input[type="checkbox"]:checked');
    analyzeState.chartConfig.yAxisMetrics = Array.from(yAxisCheckboxes).map(cb => cb.value);
    
    // Get time range
    const timeRangeSelect = document.getElementById('time-range-select');
    if (timeRangeSelect) {
        analyzeState.chartConfig.timeRange = timeRangeSelect.value;
    }
    
    // Render chart
    renderChart();
    
    // Close settings panel
    const graphSettingsPanel = document.getElementById('graph-settings-panel');
    if (graphSettingsPanel) {
        graphSettingsPanel.style.display = 'none';
    }
}

// Render chart
function renderChart() {
    const canvas = document.getElementById('main-chart');
    const loadingEl = document.getElementById('graph-loading');
    const errorEl = document.getElementById('graph-error');
    
    if (!canvas) return;
    
    // Validate configuration
    if (!analyzeState.chartConfig.xAxis || analyzeState.chartConfig.yAxisMetrics.length === 0) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'flex';
        return;
    }
    
    // Show loading
    if (loadingEl) loadingEl.style.display = 'flex';
    if (errorEl) errorEl.style.display = 'none';
    canvas.style.display = 'none';
    
    // Destroy existing chart
    if (analyzeState.chart) {
        analyzeState.chart.destroy();
    }
    
    // Prepare data
    const labels = analyzeState.parsedData.map(row => row[analyzeState.chartConfig.xAxis] || '');
    const datasets = analyzeState.chartConfig.yAxisMetrics.map((metric, index) => {
        const data = analyzeState.parsedData.map(row => {
            const value = parseFloat(row[metric]);
            return isNaN(value) ? null : value;
        });
        
        // Generate color
        const colors = [
            'rgb(37, 99, 235)',   // Blue
            'rgb(16, 185, 129)',  // Green
            'rgb(245, 158, 11)',  // Yellow
            'rgb(239, 68, 68)',   // Red
            'rgb(139, 92, 246)',  // Purple
            'rgb(236, 72, 153)',  // Pink
            'rgb(14, 165, 233)',  // Cyan
            'rgb(251, 146, 60)'   // Orange
        ];
        
        return {
            label: formatColumnName(metric),
            data: data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
            borderWidth: 2,
            fill: analyzeState.chartConfig.type === 'area' || analyzeState.chartConfig.type === 'line',
            tension: 0.4
        };
    });
    
    // Create chart
    setTimeout(() => {
        analyzeState.chart = new Chart(canvas, {
            type: analyzeState.chartConfig.type === 'scatter' ? 'line' : analyzeState.chartConfig.type,
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
                                if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
                                if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
                                return value.toFixed(2);
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
        
        // Hide loading, show chart
        if (loadingEl) loadingEl.style.display = 'none';
        canvas.style.display = 'block';
    }, 100);
}

// Export table to CSV
function exportTable() {
    if (analyzeState.parsedData.length === 0) return;
    
    // Create CSV content
    const headers = analyzeState.visibleColumns.join(',');
    const rows = analyzeState.parsedData.map(row => {
        return analyzeState.visibleColumns.map(col => {
            const value = row[col] || '';
            // Escape commas and quotes
            if (value.includes(',') || value.includes('"')) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
    });
    
    const csv = [headers, ...rows].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jiggy-capital-${analyzeState.currentDataset}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Export graph as image
function exportGraph() {
    if (!analyzeState.chart) return;
    
    const url = analyzeState.chart.toBase64Image();
    const a = document.createElement('a');
    a.href = url;
    a.download = `jiggy-capital-chart-${new Date().toISOString().split('T')[0]}.png`;
    a.click();
}

