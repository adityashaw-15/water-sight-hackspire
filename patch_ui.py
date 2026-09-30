with open('templates/satellite_analysis.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Insert leaflet CSS and JS at the top if not present
if 'leaflet.css' not in text:
    text = text.replace('{% block content %}', '{% block content %}\n<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />\n<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>')

new_html = """                    <div style="padding: 20px; background: white; border-radius: 8px; border: 1px solid var(--line); margin-top: 20px;">
                        <h4 style="margin-bottom: 15px; color: var(--primary);">ANALYSIS RESULTS</h4>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <!-- LEFT COLUMN: STATS AND CHARTS -->
                            <div>
                                <h5 style="border-bottom: 1px solid var(--line); padding-bottom: 5px;">NDVI Statistics</h5>
                                <p><strong>Min:</strong> ${res.statistics.min}</p>
                                <p><strong>Max:</strong> ${res.statistics.max}</p>
                                <p><strong>Mean:</strong> ${res.statistics.mean}</p>
                                <p><strong>Median:</strong> ${res.statistics.median}</p>
                                <p><strong>Valid Pixels:</strong> ${res.statistics.valid_pixel_count}</p>
                                
                                <h5 style="margin-top: 15px; border-bottom: 1px solid var(--line); padding-bottom: 5px;">NDWI Statistics</h5>
                                <p><strong>Mean:</strong> ${res.ndwi.mean}</p>
                                <p><strong>Water Indicator Pixels:</strong> ${res.ndwi.water_pixels}</p>
                                
                                <h5 style="margin-top: 15px; border-bottom: 1px solid var(--line); padding-bottom: 5px;">Vegetation Distribution</h5>
                                <div style="width: 100%; height: 250px;">
                                    <canvas id="vegChart"></canvas>
                                </div>
                            </div>
                            
                            <!-- RIGHT COLUMN: MAP -->
                            <div>
                                <h5 style="border-bottom: 1px solid var(--line); padding-bottom: 5px;">Map Visualization</h5>
                                <div style="margin-bottom: 10px;">
                                    <label><input type="radio" name="layerToggle" value="ndvi" checked onclick="toggleLayer('ndvi')"> NDVI</label>
                                    <label style="margin-left: 10px;"><input type="radio" name="layerToggle" value="ndwi" onclick="toggleLayer('ndwi')"> NDWI (Water Indicator)</label>
                                </div>
                                <div id="analysisMap" style="width: 100%; height: 400px; border-radius: 8px; border: 1px solid var(--line); position: relative; z-index: 1;"></div>
                            </div>
                        </div>
                    </div>`;

                    if (!window.Chart) {
                        const script = document.createElement('script');
                        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
                        script.onload = () => renderAnalysis(res);
                        document.head.appendChild(script);
                    } else {
                        renderAnalysis(res);
                    }"""

text = re.sub(r'<div style="padding: 20px; background: white; border-radius: 8px; border: 1px solid var\(--line\);">[\s\S]*?</div>`;\n\s*// Render Chart\.js[\s\S]*?renderChart\(res\.statistics\);\n\s*\}', new_html, text)

new_js = """
let mapInstance = null;
let ndviOverlay = null;
let ndwiOverlay = null;

window.toggleLayer = function(layerName) {
    if (!mapInstance) return;
    if (layerName === 'ndvi') {
        if(ndwiOverlay) mapInstance.removeLayer(ndwiOverlay);
        if(ndviOverlay) ndviOverlay.addTo(mapInstance);
    } else {
        if(ndviOverlay) mapInstance.removeLayer(ndviOverlay);
        if(ndwiOverlay) ndwiOverlay.addTo(mapInstance);
    }
};

function renderAnalysis(res) {
    // 1. Render Chart
    const ctx = document.getElementById('vegChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'],
            datasets: [{
                label: '% of Area',
                data: [
                    res.vegetation_classes['Very Low'].toFixed(1),
                    res.vegetation_classes['Low'].toFixed(1),
                    res.vegetation_classes['Moderate'].toFixed(1),
                    res.vegetation_classes['High'].toFixed(1),
                    res.vegetation_classes['Very High'].toFixed(1)
                ],
                backgroundColor: [
                    '#e5f5e0', '#a1d99b', '#74c476', '#31a354', '#006d2c'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // 2. Render Map
    if (mapInstance) {
        mapInstance.remove();
    }
    
    // Center map on bounds
    const bounds = res.bounds; // [[lat_min, lng_min], [lat_max, lng_max]]
    
    mapInstance = L.map('analysisMap').fitBounds(bounds);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);
    
    ndviOverlay = L.imageOverlay(res.preview_url, bounds, { opacity: 0.7 }).addTo(mapInstance);
    ndwiOverlay = L.imageOverlay(res.ndwi_preview_url, bounds, { opacity: 0.7 });
}
</script>"""

text = re.sub(r'function renderChart\(stats\) \{[\s\S]*?</script>', new_js, text)

with open('templates/satellite_analysis.html', 'w', encoding='utf-8') as f:
    f.write(text)
