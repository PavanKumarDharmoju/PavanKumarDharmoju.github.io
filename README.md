# Pavan Kumar Dharmoju - Personal Portfolio

A modern, responsive personal portfolio website showcasing AI/ML engineering work, projects, publications, and photography.

**Live Site:** [pavankumardharmoju.github.io](https://pavankumardharmoju.github.io)

## 🚀 Quick Start

### View the Site Locally

```bash
# Clone the repository
git clone https://github.com/PavanKumarDharmoju/PavanKumarDharmoju.github.io.git
cd PavanKumarDharmoju.github.io

# Option 1: Simple Python server
python -m http.server 8000

# Option 2: Use the CMS server (includes content management features)
python cms_server.py

# Then visit http://localhost:8000
```

## 📁 Project Structure

```
├── index.html              # Homepage / About
├── work.html               # Build Log (git-style project entries)
├── projects.html           # Project showcase
├── publications.html       # Academic publications
├── blogs.html              # Technical blog posts
├── photography.html        # Photography gallery
├── contact.html            # Contact information
├── 404.html                # Custom 404 page
│
├── blog/                   # Blog post HTML files
│   ├── mlops-best-practices.html
│   ├── llm-production-deployment.html
│   └── ...
│
├── assets/
│   ├── css/                # Custom stylesheets
│   ├── js/                 # JavaScript files
│   │   ├── cms.js          # CMS functionality
│   │   └── cms-projects.js # Project management
│   └── img/                # Images and photos
│
├── cms.html                # Content Management Interface
├── cms_server.py           # CMS backend server
├── cms_generator.py        # HTML generation from JSON
├── git_commit.py           # Auto-commit utility
│
└── CNAME                   # Custom domain configuration
```

## 🎨 Features

- **Responsive Design** - Mobile-first approach using Tailwind CSS
- **Git-Aesthetic Theme** - Work entries styled as git commits
- **Custom CMS** - Content management without manual HTML editing
- **SEO Optimized** - Proper meta tags, canonical URLs, descriptions
- **Fast Loading** - Minimal dependencies, optimized images

## 📝 Content Management

The site includes a custom CMS for easy content updates:

```bash
# Start the CMS server
python cms_server.py

# Access the CMS interface
open http://localhost:8000/cms.html
```

### CMS Features
- Add/edit/delete project entries
- Live preview of changes
- Auto-generated commit hashes
- Tag management with color coding
- Export to HTML or backup as JSON
- Git auto-commit and push

See [CMS Documentation](README_CMS.md) for detailed usage.

## 🛠️ Development

### Prerequisites
- Python 3.7+
- Modern web browser

### Using the Generator Script

```bash
# Regenerate work.html from exported CMS JSON data
python cms_generator.py data.json

# Create a backup before updating
python cms_generator.py data.json --backup
```

### File Descriptions

| File | Purpose |
|------|---------|
| `cms_server.py` | HTTP server with file saving and git operations |
| `cms_generator.py` | Generates HTML from JSON data |
| `git_commit.py` | Automates git commits with AI-generated messages |

## 🚀 Deployment

The site is automatically deployed via GitHub Pages when changes are pushed to the `main` branch.

### Manual Deployment

1. Make changes to HTML files or use the CMS
2. Test locally with `python -m http.server 8000`
3. Commit and push to `main` branch
4. GitHub Pages will automatically deploy

### Custom Domain

The `CNAME` file configures the custom domain. Update it if using a different domain.

## 🎯 Tech Stack

- **HTML5** - Semantic markup
- **Tailwind CSS** - Utility-first styling (via CDN)
- **Vanilla JavaScript** - No framework dependencies
- **Python** - CMS backend and utilities
- **GitHub Pages** - Hosting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**What this means:**
- ✅ You can use the code for learning and personal projects
- ✅ You can modify and distribute the code
- ✅ You can use it for commercial purposes
- ⚠️ You must include the original copyright notice
- ⚠️ The software is provided "as is" without warranty

**Note:** While the code is MIT licensed, my personal content (writing, photography, etc.) remains my intellectual property.

## 📬 Contact

- **Email:** [dharmojupavankumar@gmail.com](mailto:dharmojupavankumar@gmail.com)
- **LinkedIn:** [linkedin.com/in/pavankumardharmoju](https://linkedin.com/in/pavankumardharmoju)
- **GitHub:** [github.com/PavanKumarDharmoju](https://github.com/PavanKumarDharmoju)