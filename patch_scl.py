with open('analysis_service.py', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "'SCL': item.assets.get('SCL', {}).get('href'),",
    "'SCL': item.assets['SCL'].href if 'SCL' in item.assets else None,"
)

with open('analysis_service.py', 'w', encoding='utf-8') as f:
    f.write(text)
