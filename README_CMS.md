# Content Management System (CMS)

A comprehensive content management tool for managing the personal website's dynamic content without manually editing HTML files.

## Features

### 🎯 Work/Build Log Management
- Add, edit, and delete project entries with commit-style format
- Drag-and-drop reordering of entries
- Tag management with color coding
- Auto-generated commit hashes
- Live preview of changes
- Export to HTML or backup as JSON

### 🔧 Built-in Tools
- Visual form interface for content entry
- Real-time preview panel
- Data import/export functionality
- Backup and restore capabilities
- Sortable entry management

## File Structure

```
├── cms.html                 # Main CMS interface
├── assets/js/cms.js        # CMS JavaScript functionality
├── cms_generator.py        # Python script for HTML generation
└── README_CMS.md          # This documentation
```

## Getting Started

### 1. Open the CMS Interface

Open `cms.html` in your web browser:

```bash
open cms.html
# or
python -m http.server 8000  # Then visit http://localhost:8000/cms.html
```

### 2. Using the Work Tab

#### Adding New Entries
1. Fill out the form in the left panel:
   - **Commit Hash**: Auto-generated or custom (7 chars)
   - **Date**: Current date or custom
   - **Status Color**: Visual indicator (green/blue/yellow/red/purple)
   - **Entry Type**: Conventional commit types (feat/build/fix/docs/etc.)
   - **Title**: Brief description of the project
   - **Description**: Detailed explanation
   - **Tags**: Technology/category tags

2. Click "Add Entry" to save

#### Managing Existing Entries
- **Load Entries**: Import existing entries from your HTML file
- **Edit**: Click edit button on any entry to modify
- **Delete**: Remove entries with confirmation
- **Reorder**: Drag and drop entries to change order

#### Preview and Export
- **Live Preview**: See real-time changes in the right panel
- **Export HTML**: Generate updated HTML file
- **Backup Data**: Save all data as JSON
- **Import Data**: Restore from JSON backup

### 3. Using the Python Generator

For automated HTML generation from JSON data:

```bash
# Basic usage
python cms_generator.py data.json

# With backup
python cms_generator.py data.json --backup

# Custom directory
python cms_generator.py data.json --base-dir /path/to/website
```

## Data Format

### Work Entry Structure
```json
{
  "id": 1234567890,
  "commitHash": "3d2f8a1",
  "date": "Sep 3, 2025",
  "statusColor": "green",
  "entryType": "feat",
  "title": "auto-commit message generator using OpenAI API",
  "description": "Detailed description of the project...",
  "tags": ["Python", "OpenAI API", "CLI Tool"],
  "timestamp": "2025-09-06T10:30:00.000Z"
}
```

### Full Backup Structure
```json
{
  "workEntries": [/* array of entries */],
  "pageSettings": {
    "title": "Build Log",
    "description": "Page description..."
  },
  "timestamp": "2025-09-06T10:30:00.000Z"
}
```

## Workflow Recommendations

### 1. Daily Usage
1. Open CMS interface
2. Add new project entries as you complete them
3. Use live preview to check formatting
4. Export HTML when ready to update the site

### 2. Content Organization
- Use consistent entry types (feat, build, fix, etc.)
- Tag entries with relevant technologies
- Keep descriptions concise but informative
- Use appropriate status colors for visual hierarchy

### 3. Backup Strategy
- Regular JSON backups of your data
- Version control your generated HTML files
- Keep the Python generator script updated

## Tag Color System

The system automatically applies colors to common tags:

- **Blue**: Python, Performance, Kubernetes, PostgreSQL
- **Yellow**: JavaScript, Learning, Chrome Extension
- **Green**: API, Research, Analytics, File Management
- **Purple**: Machine Learning, RAG, Data Pipeline, Automation
- **Orange**: Web Scraping, Rust, TensorFlow
- **Red**: Failed Experiment, PyTorch
- **Gray**: CLI Tool (default)

## Extending the CMS

### Adding New Page Types
1. Add new tab button in `cms.html`
2. Create tab content section
3. Implement JavaScript handlers in `cms.js`
4. Add template in `cms_generator.py`

### Custom Styling
- Modify the CSS in `cms.html` head section
- Update Tailwind classes as needed
- Customize color schemes in JavaScript

## Troubleshooting

### Common Issues

**Entries not loading**: Check browser console for JavaScript errors
**Export not working**: Ensure popup blockers are disabled
**Import fails**: Verify JSON file format matches expected structure

### Browser Compatibility
- Modern browsers with ES6+ support
- Local file restrictions may require HTTP server
- Tested in Chrome, Firefox, Safari

## Future Enhancements

- [ ] Projects tab implementation
- [ ] Publications tab with embed functionality
- [ ] Photography tab with image management
- [ ] Real-time collaboration features
- [ ] Integration with Git workflows
- [ ] Automated deployment hooks

## Contributing

To improve the CMS:

1. Test new features thoroughly
2. Maintain backward compatibility
3. Update documentation
4. Follow existing code style

## License

Part of PavanKumarDharmoju.github.io repository - see main repository license.
