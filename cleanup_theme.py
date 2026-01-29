import os

def replace_in_file(filepath, replacements, encoding='utf-8'):
    try:
        try:
            with open(filepath, 'r', encoding=encoding) as f:
                content = f.read()
        except UnicodeDecodeError:
            with open(filepath, 'r', encoding='latin-1') as f:
                content = f.read()
        
        for old, new in replacements.items():
            content = content.replace(old, new)
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    except Exception as e:
        print(f"Error updating {filepath}: {e}")

# Dashboard Cleanup (Green/Purple -> Blue)
dashboard_replacements = {
    # Purple to Blue (just in case)
    'fuchsia': 'blue',
    'violet': 'sky',
    'pink': 'sky',
    '#2e1065': '#172554',
    '#4c1d95': '#1e40af',
    '#d946ef': '#2563EB',
    '#8b5cf6': '#38BDF8',
    # Green to Blue (Cleanup)
    'emerald': 'blue',
    'teal': 'sky',
    '#022c22': '#172554',
    '#065f46': '#1e40af',
    '#10b981': '#2563EB',
    '#14b8a6': '#38BDF8'
}

dashboards = ['docs/admin.html', 'docs/student.html', 'docs/trainer.html', 'docs/intern.html']
for d in dashboards:
    replace_in_file(d, dashboard_replacements)
