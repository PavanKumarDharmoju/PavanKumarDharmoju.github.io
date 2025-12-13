/**
 * Blog CMS - Complete blog writing and management system
 * Features: Markdown editor, live preview, HTML generation, auto-commit
 */

class BlogCMS {
    constructor() {
        this.currentPost = null;
        this.isEditMode = true;
        this.serverAvailable = false;
        this.existingPosts = [];
        
        // Blog template structure
        this.blogTemplate = {
            title: '',
            slug: '',
            description: '',
            date: '',
            readingTime: '',
            tags: [],
            content: '',
            published: false
        };
        
        // Markdown shortcuts
        this.markdownShortcuts = {
            'bold': '**text**',
            'italic': '*text*',
            'heading': '# Heading',
            'code': '`code`',
            'link': '[text](url)',
            'list': '- List item',
            'image': '![alt text](image-url)'
        };
    }
    
    async init() {
        console.log('BlogCMS: Initializing...');
        
        // Check if required elements exist
        const requiredElements = [
            'blog-title', 'blog-slug', 'blog-description', 'blog-content',
            'blog-preview-btn', 'blog-markdown-btn', 'blog-save-btn', 'blog-publish-btn'
        ];
        
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        if (missingElements.length > 0) {
            console.error('BlogCMS: Missing required elements:', missingElements);
            this.showMessage(`Missing elements: ${missingElements.join(', ')}`, 'error');
            return;
        }
        
        try {
            await this.checkServerStatus();
            await this.loadExistingPosts();
            this.setupEventListeners();
            this.setupMarkdownEditor();
            this.populateDefaults();
            this.updatePostsList();
            console.log('BlogCMS: Initialization complete!');
            this.showMessage('Blog CMS ready!', 'success');
        } catch (error) {
            console.error('BlogCMS: Initialization failed:', error);
            this.showMessage(`Initialization failed: ${error.message}`, 'error');
        }
    }
    
    async checkServerStatus() {
        try {
            const response = await fetch('/');
            this.serverAvailable = response.ok;
        } catch (error) {
            this.serverAvailable = false;
        }
        
        const statusEl = document.getElementById('blog-server-status');
        if (statusEl) {
            if (this.serverAvailable) {
                statusEl.textContent = '✅ Server running - Auto-save enabled';
                statusEl.className = 'text-sm text-green-800';
            } else {
                statusEl.textContent = '❌ No server - Files will download';
                statusEl.className = 'text-sm text-orange-800';
            }
        }
    }
    
    async loadExistingPosts() {
        try {
            // Scan blog directory for existing posts
            const posts = await this.scanBlogDirectory();
            this.existingPosts = posts;
            
            // Also load drafts from localStorage
            const drafts = JSON.parse(localStorage.getItem('blog_drafts') || '{}');
            const draftPosts = Object.values(drafts).map(draft => ({
                ...draft,
                published: false
            }));
            
            // Combine existing posts with drafts (avoiding duplicates)
            draftPosts.forEach(draft => {
                if (!this.existingPosts.find(p => p.slug === draft.slug)) {
                    this.existingPosts.push(draft);
                }
            });
            
            console.log(`BlogCMS: Loaded ${this.existingPosts.length} posts (${posts.length} published, ${draftPosts.length} drafts)`);
        } catch (error) {
            console.error('BlogCMS: Failed to load existing posts:', error);
            this.existingPosts = [];
        }
    }
    
    async scanBlogDirectory() {
        // In real implementation, this would scan the blog directory
        // For now, return the known blog posts with sample content
        return [
            {
                title: 'MLOps Best Practices: From Notebook to Production',
                slug: 'mlops-best-practices',
                description: 'A comprehensive guide to building robust MLOps pipelines...',
                date: '2023-10-08',
                readingTime: '12 min read',
                tags: ['MLOps', 'DevOps', 'Machine Learning', 'Production'],
                content: `# MLOps Best Practices: From Notebook to Production

## Introduction

Machine Learning Operations (MLOps) is the practice of deploying and maintaining machine learning models in production reliably and efficiently. This guide covers essential practices for taking your ML models from development to production.

## Key Components

### 1. Data Pipeline Management
- Automated data validation
- Version control for datasets
- Data quality monitoring

### 2. Model Development
- Experiment tracking
- Code versioning
- Reproducible environments

### 3. Model Deployment
- Automated testing
- Gradual rollouts
- Performance monitoring

## Best Practices

### Version Everything
\`\`\`python
# Example: Using DVC for data versioning
import dvc.api

data = dvc.api.get_url('data/training_data.csv', rev='v1.0')
\`\`\`

### Monitor Model Performance
- Set up alerts for model drift
- Track business metrics
- Implement A/B testing

## Conclusion

Successful MLOps requires careful planning, automation, and continuous monitoring. By following these practices, you can build reliable ML systems that deliver value to your business.`,
                published: true
            },
            {
                title: 'Computer Vision at the Edge: Deploying ML Models',
                slug: 'computer-vision-edge-deployment',
                description: 'Learn how to deploy computer vision models at the edge...',
                date: '2023-09-15',
                readingTime: '8 min read',
                tags: ['Computer Vision', 'Edge Computing', 'TensorFlow', 'Optimization'],
                content: `# Computer Vision at the Edge: Deploying ML Models

## Why Edge Deployment?

Deploying computer vision models at the edge brings several advantages:
- Reduced latency
- Privacy preservation
- Offline capability
- Reduced bandwidth usage

## Model Optimization Techniques

### 1. Quantization
\`\`\`python
import tensorflow as tf

# Post-training quantization
converter = tf.lite.TFLiteConverter.from_saved_model('my_model')
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()
\`\`\`

### 2. Pruning
- Remove unnecessary weights
- Maintain accuracy while reducing size

### 3. Knowledge Distillation
- Train smaller student models
- Transfer knowledge from larger teacher models

## Hardware Considerations

- **Raspberry Pi**: Good for prototyping
- **NVIDIA Jetson**: Better GPU acceleration
- **Google Coral**: Specialized for inference

## Deployment Pipeline

1. Train and validate model
2. Optimize for edge deployment
3. Package with runtime
4. Deploy to edge devices
5. Monitor performance

## Conclusion

Edge deployment of computer vision models requires careful optimization but provides significant benefits for real-world applications.`,
                published: true
            },
            {
                title: 'Attribution Modeling Deep Dive',
                slug: 'attribution-modeling-deep-dive',
                description: 'Understanding how to build effective attribution models...',
                date: '2023-08-20',
                readingTime: '15 min read',
                tags: ['Marketing Analytics', 'Attribution', 'Data Science', 'Python'],
                content: `# Attribution Modeling Deep Dive

## What is Attribution Modeling?

Attribution modeling is the process of determining which marketing channels and touchpoints contribute to conversions and sales.

## Types of Attribution Models

### 1. First-Touch Attribution
- Gives 100% credit to the first touchpoint
- Simple but often inaccurate

### 2. Last-Touch Attribution
- Gives 100% credit to the last touchpoint
- Default in many analytics tools

### 3. Linear Attribution
- Distributes credit equally across all touchpoints
- More balanced approach

### 4. Time-Decay Attribution
- Gives more credit to recent touchpoints
- Accounts for recency bias

## Building Custom Attribution Models

\`\`\`python
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression

# Sample data structure
touchpoints = pd.DataFrame({
    'user_id': [1, 1, 1, 2, 2],
    'channel': ['email', 'social', 'search', 'social', 'email'],
    'timestamp': pd.to_datetime(['2023-01-01', '2023-01-02', '2023-01-03', '2023-01-01', '2023-01-02']),
    'converted': [0, 0, 1, 0, 1]
})

# Feature engineering for attribution
def create_attribution_features(df):
    # Add time decay weights
    df['time_to_conversion'] = df.groupby('user_id')['timestamp'].transform('max') - df['timestamp']
    df['time_weight'] = np.exp(-df['time_to_conversion'].dt.days / 7)
    return df

# Model training
features = create_attribution_features(touchpoints)
model = LogisticRegression()
# ... training logic
\`\`\`

## Advanced Techniques

### Markov Chain Attribution
- Models customer journey as state transitions
- Captures interaction effects between channels

### Shapley Value Attribution
- Game theory approach
- Fair allocation of credit

## Challenges and Considerations

- **Data Quality**: Incomplete user journeys
- **Cross-Device Tracking**: Users switch devices
- **Privacy Regulations**: GDPR, CCPA compliance
- **Incrementality**: Correlation vs. causation

## Implementation Best Practices

1. Start with simple models
2. Validate against business metrics
3. Account for external factors
4. Regular model updates
5. Stakeholder education

## Conclusion

Effective attribution modeling requires combining statistical techniques with business understanding. Start simple and iterate based on results.`,
                published: true
            }
        ];
    }
    
    setupEventListeners() {
        console.log('BlogCMS: Setting up event listeners...');
        
        // Title auto-generates slug
        const titleInput = document.getElementById('blog-title');
        const slugInput = document.getElementById('blog-slug');
        if (titleInput && slugInput) {
            titleInput.addEventListener('input', (e) => {
                if (!slugInput.dataset.manual) {
                    slugInput.value = this.generateSlug(e.target.value);
                }
            });
            
            slugInput.addEventListener('input', () => {
                slugInput.dataset.manual = 'true';
            });
            console.log('BlogCMS: Title/slug listeners added');
        } else {
            console.error('BlogCMS: Title or slug input not found!');
        }
        
        // Tags input
        this.setupTagsInput();
        
        // Editor toggle
        const previewBtn = document.getElementById('blog-preview-btn');
        const markdownBtn = document.getElementById('blog-markdown-btn');
        if (previewBtn && markdownBtn) {
            previewBtn.addEventListener('click', () => {
                console.log('BlogCMS: Preview button clicked');
                this.showPreview();
            });
            markdownBtn.addEventListener('click', () => {
                console.log('BlogCMS: Markdown button clicked');
                this.showEditor();
            });
            console.log('BlogCMS: Preview/edit toggle listeners added');
        } else {
            console.error('BlogCMS: Preview or markdown button not found!');
        }
        
        // Markdown toolbar
        this.setupMarkdownToolbar();
        
        // Action buttons
        const saveBtn = document.getElementById('blog-save-btn');
        const publishBtn = document.getElementById('blog-publish-btn');
        const exportBtn = document.getElementById('blog-export-html-btn');
        const clearBtn = document.getElementById('blog-clear-btn');
        const autoCommitBtn = document.getElementById('blog-auto-commit-btn');
        const backupBtn = document.getElementById('blog-backup-btn');
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                console.log('BlogCMS: Save button clicked');
                this.saveDraft();
            });
        } else {
            console.error('BlogCMS: Save button not found!');
        }
        
        if (publishBtn) {
            publishBtn.addEventListener('click', () => {
                console.log('BlogCMS: Publish button clicked');
                this.publishPost();
            });
        } else {
            console.error('BlogCMS: Publish button not found!');
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                console.log('BlogCMS: Export button clicked');
                this.exportHTML();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                console.log('BlogCMS: Clear button clicked');
                this.clearForm();
            });
        }
        
        if (autoCommitBtn) {
            autoCommitBtn.addEventListener('click', () => {
                console.log('BlogCMS: Auto-commit button clicked');
                this.publishAndCommit();
            });
        }
        
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                console.log('BlogCMS: Backup button clicked');
                this.backupPosts();
            });
        }
        
        // Content change listener for live preview
        const contentArea = document.getElementById('blog-content');
        if (contentArea) {
            contentArea.addEventListener('input', () => {
                if (!this.isEditMode) {
                    this.updatePreview();
                }
                this.updateHTMLPreview();
            });
        }
        
        // Preview functionality
        this.showEditor(); // Start in edit mode
        
        // Auto-save functionality
        this.setupAutoSave();
        
        console.log('BlogCMS: Event listeners setup complete');
    }
    
    setupTagsInput() {
        const tagsInput = document.getElementById('blog-tags-input');
        const tagsList = document.getElementById('blog-tags-list');
        
        if (tagsInput) {
            tagsInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const tag = tagsInput.value.trim();
                    if (tag) {
                        this.addTag(tag);
                        tagsInput.value = '';
                    }
                }
            });
        }
    }
    
    setupMarkdownEditor() {
        const editor = document.getElementById('blog-content');
        if (!editor) return;
        
        // Add keyboard shortcuts
        editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        this.insertMarkdown('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.insertMarkdown('italic');
                        break;
                    case 'k':
                        e.preventDefault();
                        this.insertMarkdown('link');
                        break;
                }
            }
        });
        
        // Tab support for code blocks
        editor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = editor.selectionStart;
                const end = editor.selectionEnd;
                editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
                editor.selectionStart = editor.selectionEnd = start + 4;
            }
        });
    }
    
    setupMarkdownToolbar() {
        const tools = document.querySelectorAll('.markdown-tool');
        console.log(`BlogCMS: Found ${tools.length} markdown toolbar buttons`);
        
        tools.forEach((tool, index) => {
            const action = tool.dataset.action;
            console.log(`BlogCMS: Setting up toolbar button ${index}: ${action}`);
            tool.addEventListener('click', () => {
                console.log(`BlogCMS: Toolbar button clicked: ${action}`);
                this.insertMarkdown(action);
            });
        });
        
        if (tools.length === 0) {
            console.warn('BlogCMS: No markdown toolbar buttons found!');
        }
    }
    
    setupAutoSave() {
        let saveTimeout;
        const inputs = ['blog-title', 'blog-slug', 'blog-description', 'blog-content'];
        
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    clearTimeout(saveTimeout);
                    saveTimeout = setTimeout(() => {
                        this.autoSave();
                    }, 2000); // Save after 2 seconds of no typing
                });
            }
        });
    }
    
    insertMarkdown(action) {
        const editor = document.getElementById('blog-content');
        if (!editor) return;
        
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        let replacement = '';
        
        switch (action) {
            case 'bold':
                replacement = `**${selectedText || 'bold text'}**`;
                break;
            case 'italic':
                replacement = `*${selectedText || 'italic text'}*`;
                break;
            case 'heading':
                replacement = `# ${selectedText || 'Heading'}`;
                break;
            case 'code':
                if (selectedText.includes('\n')) {
                    replacement = `\`\`\`\n${selectedText || 'code block'}\n\`\`\``;
                } else {
                    replacement = `\`${selectedText || 'inline code'}\``;
                }
                break;
            case 'link':
                replacement = `[${selectedText || 'link text'}](url)`;
                break;
            case 'list':
                replacement = `- ${selectedText || 'list item'}`;
                break;
            case 'image':
                replacement = `![${selectedText || 'alt text'}](image-url)`;
                break;
        }
        
        editor.value = editor.value.substring(0, start) + replacement + editor.value.substring(end);
        
        // Set cursor position
        const newPos = start + replacement.length;
        editor.selectionStart = editor.selectionEnd = newPos;
        editor.focus();
        
        // Update preview if in preview mode
        if (!this.isEditMode) {
            this.updatePreview();
        }
    }
    
    addTag(tagText) {
        const tagsList = document.getElementById('blog-tags-list');
        if (!tagsList || !tagText) return;
        
        // Check if tag already exists
        const existingTags = Array.from(tagsList.querySelectorAll('.tag')).map(el => 
            el.textContent.replace('×', '').trim());
        if (existingTags.includes(tagText)) return;
        
        const tagEl = document.createElement('span');
        tagEl.className = 'tag inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mr-1 mb-1';
        tagEl.innerHTML = `
            ${tagText}
            <button type="button" class="ml-1 text-blue-600 hover:text-blue-800" onclick="this.parentElement.remove()">×</button>
        `;
        tagsList.appendChild(tagEl);
    }
    
    showPreview() {
        console.log('BlogCMS: Switching to preview mode');
        const editor = document.getElementById('blog-content');
        const preview = document.getElementById('blog-preview-content');
        const previewBtn = document.getElementById('blog-preview-btn');
        const markdownBtn = document.getElementById('blog-markdown-btn');
        
        if (editor && preview) {
            editor.style.display = 'none';
            preview.style.display = 'block';
            preview.classList.remove('hidden');
            this.updatePreview();
            this.isEditMode = false;
            
            // Update button states
            previewBtn?.classList.add('bg-blue-200', 'text-blue-800');
            previewBtn?.classList.remove('bg-blue-100', 'text-blue-700');
            markdownBtn?.classList.remove('bg-gray-200');
            markdownBtn?.classList.add('bg-gray-100');
            
            console.log('BlogCMS: Preview mode activated');
        } else {
            console.error('BlogCMS: Editor or preview element not found for preview mode');
        }
    }
    
    showEditor() {
        console.log('BlogCMS: Switching to edit mode');
        const editor = document.getElementById('blog-content');
        const preview = document.getElementById('blog-preview-content');
        const previewBtn = document.getElementById('blog-preview-btn');
        const markdownBtn = document.getElementById('blog-markdown-btn');
        
        if (editor && preview) {
            editor.style.display = 'block';
            preview.style.display = 'none';
            preview.classList.add('hidden');
            this.isEditMode = true;
            
            // Update button states
            previewBtn?.classList.remove('bg-blue-200', 'text-blue-800');
            previewBtn?.classList.add('bg-blue-100', 'text-blue-700');
            markdownBtn?.classList.add('bg-gray-200');
            markdownBtn?.classList.remove('bg-gray-100');
            
            console.log('BlogCMS: Edit mode activated');
        } else {
            console.error('BlogCMS: Editor or preview element not found for edit mode');
        }
    }
    
    updatePreview() {
        const content = document.getElementById('blog-content')?.value || '';
        const preview = document.getElementById('blog-preview-content');
        
        if (preview) {
            // Simple markdown to HTML conversion
            const html = this.markdownToHtml(content);
            preview.innerHTML = html;
        }
    }
    
    updateHTMLPreview() {
        const htmlPreview = document.getElementById('blog-html-preview');
        if (!htmlPreview) return;
        
        const blogData = this.getFormData();
        if (blogData) {
            const htmlStructure = this.generateBlogHTML(blogData);
            htmlPreview.innerHTML = `
                <div class="text-xs text-gray-600 mb-2">HTML Structure Preview:</div>
                <pre class="text-xs text-gray-700 overflow-x-auto">${this.escapeHtml(htmlStructure.substring(0, 500))}...</pre>
            `;
        }
    }
    
    markdownToHtml(markdown) {
        // Basic markdown to HTML conversion
        let html = markdown
            // Headers
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            
            // Bold and Italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
            
            // Images
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
            
            // Lists
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            
            // Paragraphs
            .split('\n\n')
            .map(p => p.trim() ? `<p>${p}</p>` : '')
            .join('\n');
        
        return html;
    }
    
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
    
    getFormData() {
        const title = document.getElementById('blog-title')?.value?.trim();
        const slug = document.getElementById('blog-slug')?.value?.trim();
        const description = document.getElementById('blog-description')?.value?.trim();
        const date = document.getElementById('blog-date')?.value;
        const readingTime = document.getElementById('blog-reading-time')?.value?.trim();
        const content = document.getElementById('blog-content')?.value?.trim();
        
        if (!title || !slug || !description || !content) {
            this.showMessage('Please fill in all required fields (Title, Slug, Description, Content)', 'error');
            return null;
        }
        
        // Get tags
        const tags = Array.from(document.querySelectorAll('#blog-tags-list .tag'))
            .map(el => el.textContent.replace('×', '').trim());
        
        return {
            title,
            slug,
            description,
            date: date || new Date().toISOString().split('T')[0],
            readingTime: readingTime || this.estimateReadingTime(content),
            tags,
            content,
            published: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }
    
    generateBlogHTML(blogData) {
        const blogTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${blogData.title} | Pavan Kumar Dharmoju</title>
    <meta name="description" content="${blogData.description}">
    <meta name="keywords" content="${blogData.tags.join(', ')}">
    <meta name="author" content="Pavan Kumar Dharmoju">
    <meta name="article:published_time" content="${blogData.date}">
    <meta name="article:author" content="Pavan Kumar Dharmoju">
    <link rel="canonical" href="https://pavankumardharmoju.github.io/blog/${blogData.slug}.html">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        body {
            font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            font-optical-sizing: auto;
            letter-spacing: -0.01em;
        }
        .prose { max-width: none; }
        .prose h1 { font-size: 2rem; font-weight: 700; margin: 2rem 0 1rem; }
        .prose h2 { font-size: 1.5rem; font-weight: 600; margin: 1.5rem 0 1rem; }
        .prose h3 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.75rem; }
        .prose p { margin: 1rem 0; line-height: 1.7; }
        .prose code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 0.25rem; font-size: 0.875em; }
        .prose pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 1.5rem 0; }
        .prose pre code { background: none; padding: 0; }
        .prose ul { margin: 1rem 0; padding-left: 1.5rem; }
        .prose li { margin: 0.5rem 0; }
        .prose blockquote { border-left: 4px solid #e2e8f0; padding-left: 1rem; margin: 1.5rem 0; font-style: italic; }
    </style>
</head>
<body class="bg-white">
    <div class="max-w-4xl mx-auto px-4 sm:px-8">
        <div class="flex flex-col sm:flex-row gap-8 pt-12">
            <!-- Sidebar -->
            <aside class="sm:w-24 shrink-0">
                <div class="flex sm:flex-col justify-between sm:space-y-4 sm:sticky sm:top-12">
                    <div class="flex items-center sm:block">
                        <a href="../index.html">
                            <img src="../assets/img/pavan.jpg" alt="Pavan Kumar Dharmoju" 
                                 class="w-20 h-20 rounded-full object-cover transform hover:rotate-12 transition-all duration-300">
                        </a>
                    </div>
                    <div>
                        <nav class="flex sm:flex-col sm:space-y-1 sm:text-right text-sm sm:text-base">
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="../index.html">About</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="../work.html">Work</a>
                            <a class="mr-4 text-gray-800" href="../blogs.html">Blogs</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="../projects.html">Projects</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="../publications.html">Publications</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="../photography.html">Photography</a>
                            <a class="mr-4 text-gray-400 hover:text-gray-900" href="../contact.html">Contact</a>
                        </nav>
                    </div>
                </div>
            </aside>

            <!-- Main Content -->
            <main class="flex-1 min-h-screen">
                <div class="max-w-2xl">
                    <!-- Article Header -->
                    <article>
                        <header class="mb-8">
                            <div class="mb-4">
                                <time class="text-sm text-gray-500" datetime="${blogData.date}">${this.formatDate(blogData.date)}</time>
                                ${blogData.readingTime ? `<span class="text-gray-400 mx-2">•</span><span class="text-sm text-gray-500">${blogData.readingTime}</span>` : ''}
                            </div>
                            <h1 class="text-3xl font-bold text-gray-900 mb-4">${blogData.title}</h1>
                            <p class="text-lg text-gray-600 leading-relaxed">${blogData.description}</p>
                            ${blogData.tags.length > 0 ? `
                            <div class="flex flex-wrap gap-2 mt-4">
                                ${blogData.tags.map(tag => `<span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">${tag}</span>`).join('')}
                            </div>` : ''}
                        </header>

                        <!-- Article Content -->
                        <div class="prose prose-gray max-w-none">
                            ${this.markdownToHtml(blogData.content)}
                        </div>
                    </article>
                </div>
            </main>
        </div>
    </div>
    
    <!-- Copyright Footer -->
    <footer class="mt-16 py-6 border-t border-gray-200">
        <div class="max-w-4xl mx-auto px-4 sm:px-8">
            <p class="text-center text-sm text-gray-500">
                © 2025 Pavan Kumar Dharmoju. All rights reserved.
            </p>
        </div>
    </footer>
</body>
</html>`;
        
        return blogTemplate;
    }
    
    estimateReadingTime(content) {
        const wordsPerMinute = 200;
        const wordCount = content.split(/\\s+/).length;
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        return `${minutes} min read`;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }
    
    populateDefaults() {
        document.getElementById('blog-date').value = new Date().toISOString().split('T')[0];
    }
    
    updatePostsList() {
        const container = document.getElementById('blog-posts-list');
        if (!container) return;
        
        if (this.existingPosts.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No blog posts yet. Create your first post!</p>';
            return;
        }
        
        container.innerHTML = this.existingPosts.map(post => `
            <div class="bg-white p-3 border border-gray-200 rounded">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-medium text-sm">${post.title}</h4>
                        <p class="text-xs text-gray-600 mt-1">${post.description.substring(0, 100)}...</p>
                        <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>${this.formatDate(post.date)}</span>
                            <span class="w-2 h-2 rounded-full ${post.published ? 'bg-green-500' : 'bg-yellow-500'}"></span>
                            <span>${post.published ? 'Published' : 'Draft'}</span>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1 ml-2">
                        <button onclick="blogCMS.editPost('${post.slug}')" 
                                class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
                            Edit
                        </button>
                        <button onclick="blogCMS.deletePost('${post.slug}')" 
                                class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    editPost(slug) {
        console.log('BlogCMS: Editing post with slug:', slug);
        console.log('BlogCMS: Available posts:', this.existingPosts.map(p => p.slug));
        
        // Find the post in existing posts or drafts
        let post = this.existingPosts.find(p => p.slug === slug);
        console.log('BlogCMS: Found in existing posts:', !!post);
        
        if (!post) {
            console.log('BlogCMS: Searching in localStorage drafts...');
            const drafts = JSON.parse(localStorage.getItem('blog_drafts') || '{}');
            post = drafts[slug];
            console.log('BlogCMS: Found in drafts:', !!post);
        }
        
        if (!post) {
            console.error('BlogCMS: Post not found:', slug);
            this.showMessage(`Post "${slug}" not found`, 'error');
            return;
        }
        
        console.log('BlogCMS: Found post:', post);
        
        // Load the post data into the form
        this.loadPostIntoForm(post);
        this.showMessage(`Loaded "${post.title}" for editing`, 'info');
    }
    
    deletePost(slug) {
        console.log('BlogCMS: Deleting post:', slug);
        
        if (!confirm(`Are you sure you want to delete the post "${slug}"? This cannot be undone.`)) {
            return;
        }
        
        // Remove from existing posts
        this.existingPosts = this.existingPosts.filter(p => p.slug !== slug);
        
        // Remove from drafts
        const drafts = JSON.parse(localStorage.getItem('blog_drafts') || '{}');
        delete drafts[slug];
        localStorage.setItem('blog_drafts', JSON.stringify(drafts));
        
        // Update the posts list
        this.updatePostsList();
        
        this.showMessage(`Post "${slug}" deleted`, 'success');
    }
    
    loadPostIntoForm(post) {
        console.log('BlogCMS: Loading post into form:', post);
        
        // Check if all required elements exist
        const titleEl = document.getElementById('blog-title');
        const slugEl = document.getElementById('blog-slug');
        const descEl = document.getElementById('blog-description');
        const dateEl = document.getElementById('blog-date');
        const readingTimeEl = document.getElementById('blog-reading-time');
        const contentEl = document.getElementById('blog-content');
        const tagsListEl = document.getElementById('blog-tags-list');
        
        if (!titleEl || !slugEl || !descEl || !contentEl) {
            console.error('BlogCMS: Required form elements not found!');
            this.showMessage('Form elements not found - cannot load post', 'error');
            return;
        }
        
        // Fill basic fields with debugging
        console.log('BlogCMS: Setting title:', post.title);
        titleEl.value = post.title || '';
        
        console.log('BlogCMS: Setting slug:', post.slug);
        slugEl.value = post.slug || '';
        
        console.log('BlogCMS: Setting description:', post.description);
        descEl.value = post.description || '';
        
        console.log('BlogCMS: Setting date:', post.date);
        if (dateEl) dateEl.value = post.date || '';
        
        console.log('BlogCMS: Setting reading time:', post.readingTime);
        if (readingTimeEl) readingTimeEl.value = post.readingTime || '';
        
        console.log('BlogCMS: Setting content length:', post.content ? post.content.length : 0);
        contentEl.value = post.content || '';
        
        // Clear existing tags
        if (tagsListEl) {
            tagsListEl.innerHTML = '';
            console.log('BlogCMS: Cleared existing tags');
        }
        
        // Add tags
        if (post.tags && post.tags.length > 0) {
            console.log('BlogCMS: Adding tags:', post.tags);
            post.tags.forEach(tag => this.addTag(tag));
        }
        
        // Update previews
        console.log('BlogCMS: Updating previews...');
        this.updateHTMLPreview();
        if (!this.isEditMode) {
            this.updatePreview();
        }
        
        // Mark slug as manually set to prevent auto-generation
        slugEl.dataset.manual = 'true';
        
        console.log('BlogCMS: Post loaded successfully');
    }
    
    async saveDraft() {
        const blogData = this.getFormData();
        if (!blogData) return;
        
        blogData.published = false;
        
        // Save to localStorage
        const drafts = JSON.parse(localStorage.getItem('blog_drafts') || '{}');
        drafts[blogData.slug] = blogData;
        localStorage.setItem('blog_drafts', JSON.stringify(drafts));
        
        this.showMessage(`Draft "${blogData.title}" saved locally`, 'success');
    }
    
    async publishPost() {
        const blogData = this.getFormData();
        if (!blogData) return;
        
        blogData.published = true;
        
        // Generate HTML
        const html = this.generateBlogHTML(blogData);
        const filename = `blog/${blogData.slug}.html`;
        
        if (this.serverAvailable) {
            try {
                const response = await fetch('/save-file', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filename: filename,
                        content: html
                    })
                });
                
                if (response.ok) {
                    this.showMessage(`✅ Blog post "${blogData.title}" published!`, 'success');
                    // Remove from drafts
                    this.removeDraft(blogData.slug);
                    // Add to existing posts
                    this.existingPosts.unshift(blogData);
                    this.updatePostsList();
                    return true;
                } else {
                    throw new Error('Server save failed');
                }
            } catch (error) {
                console.error('Server save failed, falling back to download:', error);
            }
        }
        
        // Fallback to download
        this.downloadFile(filename, html);
        this.showMessage(`📁 ${filename} downloaded`, 'info');
        return false;
    }
    
    exportHTML() {
        const blogData = this.getFormData();
        if (!blogData) return;
        
        const html = this.generateBlogHTML(blogData);
        const filename = `blog/${blogData.slug}.html`;
        
        this.downloadFile(filename, html);
        this.showMessage(`📁 HTML exported: ${filename}`, 'success');
    }
    
    clearForm() {
        if (!confirm('Clear all content? This cannot be undone.')) return;
        
        document.getElementById('blog-title').value = '';
        document.getElementById('blog-slug').value = '';
        document.getElementById('blog-description').value = '';
        document.getElementById('blog-reading-time').value = '';
        document.getElementById('blog-content').value = '';
        document.getElementById('blog-tags-list').innerHTML = '';
        
        // Reset slug manual flag
        delete document.getElementById('blog-slug').dataset.manual;
        
        this.updateHTMLPreview();
        this.showMessage('Form cleared', 'info');
    }
    
    async publishAndCommit() {
        const published = await this.publishPost();
        
        if (published && this.serverAvailable) {
            const blogData = this.getFormData();
            try {
                const response = await fetch('/git-commit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `feat: publish blog post "${blogData.title}"`
                    })
                });
                
                if (response.ok) {
                    this.showMessage('🚀 Blog published and committed!', 'success');
                } else {
                    this.showMessage('✅ Blog published, but commit failed', 'warning');
                }
            } catch (error) {
                this.showMessage('✅ Blog published, commit manually with git_commit.py', 'warning');
            }
        }
    }
    
    async autoSave() {
        const title = document.getElementById('blog-title')?.value?.trim();
        if (!title) return;
        
        const autoSaveData = {
            title,
            slug: document.getElementById('blog-slug')?.value?.trim(),
            description: document.getElementById('blog-description')?.value?.trim(),
            content: document.getElementById('blog-content')?.value?.trim(),
            timestamp: Date.now()
        };
        
        localStorage.setItem('blog_autosave', JSON.stringify(autoSaveData));
        
        // Show subtle auto-save indicator
        const indicator = document.createElement('div');
        indicator.className = 'fixed top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded text-sm';
        indicator.textContent = '💾 Auto-saved';
        document.body.appendChild(indicator);
        
        setTimeout(() => indicator.remove(), 2000);
    }
    
    backupPosts() {
        const backup = {
            posts: this.existingPosts,
            drafts: JSON.parse(localStorage.getItem('blog_drafts') || '{}'),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `blog-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showMessage('📦 Blog backup created', 'success');
    }
    
    // Utility methods
    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    removeDraft(slug) {
        const drafts = JSON.parse(localStorage.getItem('blog_drafts') || '{}');
        delete drafts[slug];
        localStorage.setItem('blog_drafts', JSON.stringify(drafts));
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showMessage(message, type = 'info') {
        console.log(`BlogCMS [${type}]:`, message);
        
        const toast = document.createElement('div');
        const bgColor = {
            'success': 'bg-green-100 border-green-500 text-green-700',
            'error': 'bg-red-100 border-red-500 text-red-700',
            'warning': 'bg-yellow-100 border-yellow-500 text-yellow-700',
            'info': 'bg-blue-100 border-blue-500 text-blue-700'
        }[type] || 'bg-gray-100 border-gray-500 text-gray-700';
        
        toast.className = `fixed top-4 right-4 p-4 border-l-4 rounded shadow-lg z-50 max-w-sm ${bgColor}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// Initialize when DOM is ready
let blogCMS;
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        if (document.getElementById('blogs-tab')) {
            console.log('BlogCMS: Found blogs tab, creating instance...');
            blogCMS = new BlogCMS();
            
            // Initialize when blogs tab is first clicked or already active
            const blogsTab = document.querySelector('[data-tab="blogs"]');
            if (blogsTab) {
                console.log('BlogCMS: Adding click listener to blogs tab button...');
                
                // Check if tab is already active (has the blue border)
                if (blogsTab.classList.contains('border-blue-500') || 
                    document.getElementById('blogs-tab').classList.contains('active')) {
                    console.log('BlogCMS: Tab is already active, initializing immediately...');
                    if (!blogCMS.initialized) {
                        blogCMS.init();
                        blogCMS.initialized = true;
                    }
                }
                
                // Listen for tab clicks
                blogsTab.addEventListener('click', () => {
                    console.log('BlogCMS: Tab clicked, checking initialization...');
                    if (!blogCMS.initialized) {
                        console.log('BlogCMS: Initializing for the first time...');
                        blogCMS.init();
                        blogCMS.initialized = true;
                    } else {
                        console.log('BlogCMS: Already initialized');
                    }
                });
                
                // Also listen for the main CMS tab switching
                document.addEventListener('click', (e) => {
                    if (e.target.dataset && e.target.dataset.tab === 'blogs') {
                        setTimeout(() => {
                            if (!blogCMS.initialized && document.getElementById('blogs-tab').classList.contains('active')) {
                                console.log('BlogCMS: Initializing after tab switch...');
                                blogCMS.init();
                                blogCMS.initialized = true;
                            }
                        }, 100);
                    }
                });
            } else {
                console.error('BlogCMS: Could not find blogs tab button');
            }
        } else {
            console.error('BlogCMS: Could not find blogs-tab element');
        }
    }, 200);
});