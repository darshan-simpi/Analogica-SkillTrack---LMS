ALLOWED_EXTENSIONS = {'pdf', 'zip', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_required_assignments(duration_str):
    if not duration_str:
        return 4 # Default fallback
    try:
        # Match digits for flexible strings like "1month", "3 months", etc.
        import re
        match = re.search(r'(\d+)', str(duration_str))
        num = int(match.group(1)) if match else 1
        if num <= 0: num = 1
        
        low_dur = str(duration_str).lower()
        if "month" in low_dur:
            return num * 4
        elif "week" in low_dur:
            return num
        return 4
    except:
        return 4

def parse_duration_to_days(duration_str):
    if not duration_str:
        return 60 # Default to 2 months
    try:
        import re
        match = re.search(r'(\d+)', str(duration_str))
        num = int(match.group(1)) if match else 1
        if num <= 0: num = 1
        
        low_dur = str(duration_str).lower()
        if "month" in low_dur:
            return num * 30
        elif "week" in low_dur:
            return num * 7
        elif "day" in low_dur:
            return num
        return 60
    except:
        return 60
