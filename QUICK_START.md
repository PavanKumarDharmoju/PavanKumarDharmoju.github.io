# 🚀 Quick Start Guide - CMS

## Option 1: Server Mode (Recommended)

```bash
# 1. Start the CMS server
python cms_server.py

# 2. Open your browser to http://localhost:8000
# 3. Use the CMS interface
# 4. Click "Export + Auto Commit & Push" when done
```

## Option 2: Manual Mode

```bash
# 1. Open cms.html directly in browser
open cms.html

# 2. Use the CMS interface
# 3. Click "Export HTML Only"
# 4. Run git commit manually:
python git_commit.py
```

## 🎯 Quick Workflow

1. **Load Data**: Click "Load Existing Entries" to import from work.html
2. **Add Entry**: Fill form and click "Add Entry"
3. **Preview**: Check the live preview on the right
4. **Export**: Use "Export + Auto Commit & Push" for one-click deployment

## 📁 Files Created

- `cms.html` - Main CMS interface
- `assets/js/cms.js` - CMS functionality
- `cms_server.py` - Development server
- `git_commit.py` - Git automation
- `cms_generator.py` - HTML generator

## 🎨 Features Built

✅ **Load all existing entries** from work.html with real parsing
✅ **Scroll container** for entries (max height with scrolling)
✅ **Direct file saving** to current directory (when using server)
✅ **Auto git commit & push** workflow
✅ **Complete HTML generation** with proper structure
✅ **Tag management** with color coding
✅ **Form validation** and error handling
✅ **Live preview** of changes

## 🔄 Next Steps

After testing the Work tab, we can build:
- Projects tab
- Publications tab  
- Photography tab

Each with similar functionality but tailored to their content types.
