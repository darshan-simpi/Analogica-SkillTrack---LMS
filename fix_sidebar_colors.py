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

# Color Replacements (Green to Blue)
replacements = {
    # Active State Classes (Green -> Blue)
    'bg-emerald-600': 'bg-blue-600',
    'shadow-emerald-500/30': 'shadow-blue-500/30',
    # Hover State Hex (Dark Green -> Dark Blue)
    '#064e3b': '#1e40af', 
    # Hover State Classes (if any left)
    'hover:bg-[#064e3b]': 'hover:bg-[#1e40af]',
    # Text Colors
    'text-emerald-400': 'text-blue-400',
    'text-emerald-500': 'text-blue-500',
    'bg-emerald-500': 'bg-blue-500',
    'border-emerald-700': 'border-blue-700'
}

dashboards = ['docs/admin.html', 'docs/student.html', 'docs/trainer.html', 'docs/intern.html']
for d in dashboards:
    replace_in_file(d, replacements)
