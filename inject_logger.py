with open('c:/Users/user/Documents/ChatGPT/water-sight/water-sight/templates/dashboard.html', 'r') as f:
    text = f.read()
text = text.replace('<head>', '<head><script>window.onerror = function(m, s, l, c, e) { fetch("http://localhost:5001/log_error", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({message: m, source: s, lineno: l, colno: c, error: e ? e.stack : ""})}); };</script>')
with open('c:/Users/user/Documents/ChatGPT/water-sight/water-sight/templates/dashboard.html', 'w') as f:
    f.write(text)
