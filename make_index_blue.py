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

# Index.html to Blue
index_replacements = {
    'emerald': 'blue',
    'teal': 'sky',
    '#10b981': '#2563EB',
    '#14b8a6': '#38BDF8'
}
replace_in_file('docs/index.html', index_replacements)
