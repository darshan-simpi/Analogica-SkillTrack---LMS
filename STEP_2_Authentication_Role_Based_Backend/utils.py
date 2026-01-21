ALLOWED_EXTENSIONS = {'pdf', 'zip', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
