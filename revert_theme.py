import os

def replace_in_file(filepath, replacements, encoding='utf-8'):
    try:
        # Try reading with utf-8, fallback to latin-1 if fails
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

# Index.html Revert (Purple -> Green)
index_replacements = {
    'fuchsia': 'emerald',
    'violet': 'teal',
    '#d946ef': '#10b981',
    '#8b5cf6': '#14b8a6'
}
replace_in_file('docs/index.html', index_replacements)

# Dashboard Revert (Purple -> Blue)
dashboard_replacements = {
    'fuchsia': 'blue',
    'violet': 'sky',
    'pink': 'sky',
    '#2e1065': '#172554',
    '#4c1d95': '#1e40af',
    '#d946ef': '#2563EB',
    '#8b5cf6': '#38BDF8'
}

dashboards = ['docs/admin.html', 'docs/student.html', 'docs/trainer.html', 'docs/intern.html']
for d in dashboards:
    replace_in_file(d, dashboard_replacements)
