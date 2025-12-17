# Clean templates.js by removing v1 template code
with open('web_interface/static/js/templates.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines 1-780 (good code) and skip the orphaned v1 code
with open('web_interface/static/js/templates.js', 'w', encoding='utf-8') as out:
    out.writelines(lines[:781])  # Lines 0-780 (inclusive, 781 lines total)
    
print("File cleaned successfully!")
