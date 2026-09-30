with open('templates/satellite_analysis.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re

new_html = r'''                    <div style="padding: 20px; background: white; border-radius: 8px; border: 1px solid var(--line);">
                        <h4 style="margin-bottom: 15px; color: var(--primary);">NDVI ANALYSIS COMPLETE</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                            <div>
                                <p><strong>Scene:</strong> ${res.scene_id}</p>
                                <p><strong>Acquired:</strong> ${res.acquisition_date.substring(0,10)}</p>
                                <p><strong>Cloud Cover:</strong> ${res.cloud_cover}%</p>
                                <p><strong>Source:</strong> ${res.source}</p>
                                <h5 style="margin-top: 15px; border-bottom: 1px solid var(--line); padding-bottom: 5px;">Statistics</h5>
                                <div style="width: 100%; height: 200px;">
                                    <canvas id="ndviChart"></canvas>
                                </div>
                            </div>
                            <div>
                                <strong style="display: block; margin-bottom: 10px;">NDVI Preview</strong>
                                <img src="${res.preview_url}" style="width: 100%; height: auto; border: 1px solid var(--line); border-radius: 4px;" />
                            </div>
                        </div>
                    </div>`;
                    
                    // Render Chart.js
                    if (!window.Chart) {
                        const script = document.createElement('script');
                        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
                        script.onload = () => renderChart(res.statistics);
                        document.head.appendChild(script);
                    } else {
                        renderChart(res.statistics);
                    }'''

text = re.sub(r'<div style="padding: 20px; background: white; border-radius: 8px; border: 1px solid var\(--line\);">[\s\S]*?</div>`;', new_html, text)

chart_func = '''
function renderChart(stats) {
    const ctx = document.getElementById('ndviChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Min', 'Mean', 'Median', 'Max'],
            datasets: [{
                label: 'NDVI Value',
                data: [stats.min, stats.mean, stats.median, stats.max],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(54, 162, 235, 0.6)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1
                }
            }
        }
    });
}
</script>'''

text = text.replace('</script>', chart_func)

with open('templates/satellite_analysis.html', 'w', encoding='utf-8') as f:
    f.write(text)
