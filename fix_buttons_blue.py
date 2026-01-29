import os

def replace_in_file(filepath, replacements, encoding='utf-8'):
    if not os.path.exists(filepath):
        print(f"Skipping {filepath} (not found)")
        return
        
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

# Detailed Green -> Blue Replacements
replacements = {
    # Main Buttons (Emerald -> Blue)
    'bg-[#059669]': 'bg-blue-600',
    'bg-emerald-600': 'bg-blue-600',
    'bg-emerald-500': 'bg-blue-500',
    'hover:bg-emerald-700': 'hover:bg-blue-700',
    
    # Light Backgrounds (Light Green -> Light Blue)
    'bg-[#ecfdf5]': 'bg-blue-50',
    'bg-emerald-50': 'bg-blue-50',
    'bg-emerald-100': 'bg-blue-100',
    'hover:bg-[#ecfdf5]': 'hover:bg-blue-50',
    
    # Text Colors (Green -> Blue)
    'text-[#059669]': 'text-blue-600',
    'text-emerald-600': 'text-blue-600',
    'text-emerald-700': 'text-blue-700',
    'text-emerald-500': 'text-blue-500',
    
    # Borders
    'border-emerald-200': 'border-blue-200',
    
    # Shadows
    'shadow-emerald-500/20': 'shadow-blue-500/20',
    
    # Specific Admin Elements
    'focus:ring-emerald-500': 'focus:ring-blue-500',
    
    # Fix potential leftover specific hexes from previous edits
    '#059669': '#2563EB', # Emerald 600 -> Blue 600
    '#ecfdf5': '#eff6ff', # Emerald 50 -> Blue 50
    '#10b981': '#3b82f6', # Emerald 500 -> Blue 500
    '#34d399': '#60a5fa', # Emerald 400 -> Blue 400
}

files = [
    'docs/admin.html',
    'docs/student.html', 
    'docs/trainer.html', 
    'docs/intern.html',
    'docs/trainer.js',
    'docs/intern.js',
    'docs/student.js'
]

for f in files:
    replace_in_file(f, replacements)
