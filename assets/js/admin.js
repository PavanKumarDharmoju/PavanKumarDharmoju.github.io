// Website Content Manager JavaScript
class WebsiteManager {
    constructor() {
        this.config = {
            profile: {
                name: 'Pavan Kumar Dharmoju',
                title: 'AI Engineer & Data Scientist',
                bio: 'Building AI systems that work in the real world. Currently working on marketing attribution modeling and scaling data pipelines for a 6-person team.',
                location: 'Chicago, IL',
                status: 'available',
                image: 'assets/img/pavan.jpg'
            },
            contact: {
                email: 'dharmojupavankumar@gmail.com',
                linkedin: 'https://linkedin.com/in/pavandharmoju/',
                github: 'https://github.com/pavankumardharmoju',
                instagram: 'pixelsbypavan',
                youtube: 'pixelsbypavan',
                scholar: 'hxxQ3D4AAAAJ'
            },
            work: [],
            projects: [],
            blogs: [],
            publications: [],
            photography: []
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadConfiguration();
        this.updateLivePreview();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Profile form listeners
        const profileInputs = ['profileName', 'profileTitle', 'profileBio', 'profileLocation', 'profileStatus'];
        profileInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateLivePreview());
            }
        });

        // Image upload
        document.getElementById('profileImage')?.addEventListener('change', (e) => this.handleImageUpload(e));

        // Add buttons
        document.getElementById('addWorkBtn')?.addEventListener('click', () => this.addWorkExperience());
        document.getElementById('addProjectBtn')?.addEventListener('click', () => this.addProject());
        document.getElementById('addBlogBtn')?.addEventListener('click', () => this.addBlog());
        document.getElementById('addPublicationBtn')?.addEventListener('click', () => this.addPublication());
        document.getElementById('addPhotoSeriesBtn')?.addEventListener('click', () => this.addPhotoSeries());

        // Save and export buttons
        document.getElementById('saveAllBtn')?.addEventListener('click', () => this.saveAllChanges());
        document.getElementById('exportConfigBtn')?.addEventListener('click', () => this.exportConfiguration());
        document.getElementById('importConfigBtn')?.addEventListener('click', () => document.getElementById('importConfigFile').click());
        document.getElementById('importConfigFile')?.addEventListener('change', (e) => this.importConfiguration(e));

        // Preview button
        document.getElementById('previewBtn')?.addEventListener('click', () => this.previewSite());
    }

    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Remove active state from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });

        // Show selected tab content
        document.getElementById(tabName)?.classList.add('active');

        // Set active state on selected tab button
        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('border-transparent', 'text-gray-500');
            activeBtn.classList.add('border-blue-500', 'text-blue-600');
        }

        // Load tab-specific content
        this.loadTabContent(tabName);
    }

    loadTabContent(tabName) {
        switch(tabName) {
            case 'work':
                this.renderWorkExperiences();
                break;
            case 'projects':
                this.renderProjects();
                break;
            case 'blogs':
                this.renderBlogs();
                break;
            case 'publications':
                this.renderPublications();
                break;
            case 'photography':
                this.renderPhotoSeries();
                break;
        }
    }

    updateLivePreview() {
        const name = document.getElementById('profileName')?.value || this.config.profile.name;
        const title = document.getElementById('profileTitle')?.value || this.config.profile.title;
        const bio = document.getElementById('profileBio')?.value || this.config.profile.bio;
        const location = document.getElementById('profileLocation')?.value || this.config.profile.location;
        const status = document.getElementById('profileStatus')?.value || this.config.profile.status;

        // Update preview elements
        document.getElementById('previewName').textContent = name;
        document.getElementById('previewTitle').textContent = title;
        document.getElementById('previewBio').textContent = bio;
        document.getElementById('previewLocation').textContent = `📍 ${location}`;
        
        const statusText = {
            'available': 'Available for opportunities',
            'busy': 'Currently busy',
            'open': 'Open to collaborations',
            'freelance': 'Available for freelance'
        };
        document.getElementById('previewStatus').textContent = statusText[status] || statusText.available;
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('previewImage').src = e.target.result;
                this.config.profile.image = e.target.result; // In real implementation, would upload to server
            };
            reader.readAsDataURL(file);
        }
    }

    addWorkExperience() {
        const workItem = {
            id: Date.now(),
            company: '',
            position: '',
            duration: '',
            location: '',
            description: '',
            technologies: '',
            commitHash: this.generateCommitHash(),
            date: new Date().toISOString().split('T')[0]
        };

        this.config.work.push(workItem);
        this.renderWorkExperiences();
    }

    renderWorkExperiences() {
        const container = document.getElementById('workExperiences');
        if (!container) return;

        container.innerHTML = this.config.work.map(work => `
            <div class="form-section" data-id="${work.id}">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-medium text-gray-900">Work Experience #${work.id}</h3>
                    <button onclick="websiteManager.removeWorkExperience(${work.id})" 
                            class="text-red-600 hover:text-red-800">🗑️ Remove</button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Company</label>
                        <input type="text" value="${work.company}" 
                               onchange="websiteManager.updateWork(${work.id}, 'company', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="Company name">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Position</label>
                        <input type="text" value="${work.position}" 
                               onchange="websiteManager.updateWork(${work.id}, 'position', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="Job title">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                        <input type="text" value="${work.duration}" 
                               onchange="websiteManager.updateWork(${work.id}, 'duration', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="Jan 2023 - Present">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input type="text" value="${work.location}" 
                               onchange="websiteManager.updateWork(${work.id}, 'location', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="City, State">
                    </div>
                </div>
                
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea rows="3" onchange="websiteManager.updateWork(${work.id}, 'description', this.value)"
                              class="w-full border border-gray-300 rounded-md px-3 py-2" 
                              placeholder="Job description and achievements">${work.description}</textarea>
                </div>
                
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Technologies/Skills</label>
                    <input type="text" value="${work.technologies}" 
                           onchange="websiteManager.updateWork(${work.id}, 'technologies', this.value)"
                           class="w-full border border-gray-300 rounded-md px-3 py-2" 
                           placeholder="Python, SQL, AWS, etc.">
                </div>
            </div>
        `).join('');
    }

    updateWork(id, field, value) {
        const work = this.config.work.find(w => w.id === id);
        if (work) {
            work[field] = value;
        }
    }

    removeWorkExperience(id) {
        this.config.work = this.config.work.filter(w => w.id !== id);
        this.renderWorkExperiences();
    }

    addProject() {
        const project = {
            id: Date.now(),
            name: '',
            description: '',
            technologies: '',
            githubUrl: '',
            liveUrl: '',
            status: 'completed',
            commitHash: this.generateCommitHash(),
            date: new Date().toISOString().split('T')[0]
        };

        this.config.projects.push(project);
        this.renderProjects();
    }

    renderProjects() {
        const container = document.getElementById('projectsList');
        if (!container) return;

        container.innerHTML = this.config.projects.map(project => `
            <div class="form-section" data-id="${project.id}">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-medium text-gray-900">Project #${project.id}</h3>
                    <button onclick="websiteManager.removeProject(${project.id})" 
                            class="text-red-600 hover:text-red-800">🗑️ Remove</button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                        <input type="text" value="${project.name}" 
                               onchange="websiteManager.updateProject(${project.id}, 'name', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="Project name">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select onchange="websiteManager.updateProject(${project.id}, 'status', this.value)"
                                class="w-full border border-gray-300 rounded-md px-3 py-2">
                            <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="in-progress" ${project.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                            <option value="planned" ${project.status === 'planned' ? 'selected' : ''}>Planned</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
                        <input type="url" value="${project.githubUrl}" 
                               onchange="websiteManager.updateProject(${project.id}, 'githubUrl', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="https://github.com/username/repo">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Live URL</label>
                        <input type="url" value="${project.liveUrl}" 
                               onchange="websiteManager.updateProject(${project.id}, 'liveUrl', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="https://project-demo.com">
                    </div>
                </div>
                
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea rows="3" onchange="websiteManager.updateProject(${project.id}, 'description', this.value)"
                              class="w-full border border-gray-300 rounded-md px-3 py-2" 
                              placeholder="Project description">${project.description}</textarea>
                </div>
                
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Technologies</label>
                    <input type="text" value="${project.technologies}" 
                           onchange="websiteManager.updateProject(${project.id}, 'technologies', this.value)"
                           class="w-full border border-gray-300 rounded-md px-3 py-2" 
                           placeholder="React, Node.js, MongoDB, etc.">
                </div>
            </div>
        `).join('');
    }

    updateProject(id, field, value) {
        const project = this.config.projects.find(p => p.id === id);
        if (project) {
            project[field] = value;
        }
    }

    removeProject(id) {
        this.config.projects = this.config.projects.filter(p => p.id !== id);
        this.renderProjects();
    }

    addBlog() {
        const blog = {
            id: Date.now(),
            title: '',
            excerpt: '',
            content: '',
            tags: '',
            publishDate: new Date().toISOString().split('T')[0],
            readTime: '5 min read',
            status: 'draft'
        };

        this.config.blogs.push(blog);
        this.renderBlogs();
    }

    renderBlogs() {
        const container = document.getElementById('blogsList');
        if (!container) return;

        container.innerHTML = this.config.blogs.map(blog => `
            <div class="form-section" data-id="${blog.id}">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-medium text-gray-900">Blog Post #${blog.id}</h3>
                    <button onclick="websiteManager.removeBlog(${blog.id})" 
                            class="text-red-600 hover:text-red-800">🗑️ Remove</button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" value="${blog.title}" 
                               onchange="websiteManager.updateBlog(${blog.id}, 'title', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="Blog post title">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select onchange="websiteManager.updateBlog(${blog.id}, 'status', this.value)"
                                class="w-full border border-gray-300 rounded-md px-3 py-2">
                            <option value="draft" ${blog.status === 'draft' ? 'selected' : ''}>Draft</option>
                            <option value="published" ${blog.status === 'published' ? 'selected' : ''}>Published</option>
                        </select>
                    </div>
                </div>
                
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                    <textarea rows="2" onchange="websiteManager.updateBlog(${blog.id}, 'excerpt', this.value)"
                              class="w-full border border-gray-300 rounded-md px-3 py-2" 
                              placeholder="Brief description of the blog post">${blog.excerpt}</textarea>
                </div>
                
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Content (Markdown)</label>
                    <textarea rows="8" onchange="websiteManager.updateBlog(${blog.id}, 'content', this.value)"
                              class="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm" 
                              placeholder="Write your blog content in Markdown...">${blog.content}</textarea>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                        <input type="text" value="${blog.tags}" 
                               onchange="websiteManager.updateBlog(${blog.id}, 'tags', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="machine learning, python, ai">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Publish Date</label>
                        <input type="date" value="${blog.publishDate}" 
                               onchange="websiteManager.updateBlog(${blog.id}, 'publishDate', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2">
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateBlog(id, field, value) {
        const blog = this.config.blogs.find(b => b.id === id);
        if (blog) {
            blog[field] = value;
        }
    }

    removeBlog(id) {
        this.config.blogs = this.config.blogs.filter(b => b.id !== id);
        this.renderBlogs();
    }

    addPublication() {
        const publication = {
            id: Date.now(),
            title: '',
            authors: '',
            venue: '',
            year: new Date().getFullYear(),
            abstract: '',
            url: '',
            pdfUrl: '',
            citationCount: 0
        };

        this.config.publications.push(publication);
        this.renderPublications();
    }

    renderPublications() {
        const container = document.getElementById('publicationsList');
        if (!container) return;

        container.innerHTML = this.config.publications.map(pub => `
            <div class="form-section" data-id="${pub.id}">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-medium text-gray-900">Publication #${pub.id}</h3>
                    <button onclick="websiteManager.removePublication(${pub.id})" 
                            class="text-red-600 hover:text-red-800">🗑️ Remove</button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input type="text" value="${pub.title}" 
                               onchange="websiteManager.updatePublication(${pub.id}, 'title', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="Publication title">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Authors</label>
                        <input type="text" value="${pub.authors}" 
                               onchange="websiteManager.updatePublication(${pub.id}, 'authors', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="Author 1, Author 2, Author 3">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                        <input type="text" value="${pub.venue}" 
                               onchange="websiteManager.updatePublication(${pub.id}, 'venue', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="Conference/Journal name">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <input type="number" value="${pub.year}" 
                               onchange="websiteManager.updatePublication(${pub.id}, 'year', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="2024">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Publication URL</label>
                        <input type="url" value="${pub.url}" 
                               onchange="websiteManager.updatePublication(${pub.id}, 'url', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="https://doi.org/...">
                    </div>
                </div>
                
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Abstract</label>
                    <textarea rows="4" onchange="websiteManager.updatePublication(${pub.id}, 'abstract', this.value)"
                              class="w-full border border-gray-300 rounded-md px-3 py-2" 
                              placeholder="Publication abstract">${pub.abstract}</textarea>
                </div>
            </div>
        `).join('');
    }

    updatePublication(id, field, value) {
        const publication = this.config.publications.find(p => p.id === id);
        if (publication) {
            publication[field] = value;
        }
    }

    removePublication(id) {
        this.config.publications = this.config.publications.filter(p => p.id !== id);
        this.renderPublications();
    }

    addPhotoSeries() {
        const series = {
            id: Date.now(),
            title: '',
            description: '',
            location: '',
            year: new Date().getFullYear(),
            camera: '',
            lens: '',
            photos: []
        };

        this.config.photography.push(series);
        this.renderPhotoSeries();
    }

    renderPhotoSeries() {
        const container = document.getElementById('photoSeriesList');
        if (!container) return;

        container.innerHTML = this.config.photography.map(series => `
            <div class="form-section" data-id="${series.id}">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-medium text-gray-900">Photo Series #${series.id}</h3>
                    <button onclick="websiteManager.removePhotoSeries(${series.id})" 
                            class="text-red-600 hover:text-red-800">🗑️ Remove</button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Series Title</label>
                        <input type="text" value="${series.title}" 
                               onchange="websiteManager.updatePhotoSeries(${series.id}, 'title', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="Photography series title">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input type="text" value="${series.location}" 
                               onchange="websiteManager.updatePhotoSeries(${series.id}, 'location', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="Location">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Camera</label>
                        <input type="text" value="${series.camera}" 
                               onchange="websiteManager.updatePhotoSeries(${series.id}, 'camera', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="Camera model">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <input type="number" value="${series.year}" 
                               onchange="websiteManager.updatePhotoSeries(${series.id}, 'year', this.value)"
                               class="w-full border border-gray-300 rounded-md px-3 py-2" 
                               placeholder="2024">
                    </div>
                </div>
                
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea rows="3" onchange="websiteManager.updatePhotoSeries(${series.id}, 'description', this.value)"
                              class="w-full border border-gray-300 rounded-md px-3 py-2" 
                              placeholder="Series description">${series.description}</textarea>
                </div>
                
                <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Upload Photos</label>
                    <input type="file" multiple accept="image/*" 
                           onchange="websiteManager.handlePhotoUpload(${series.id}, this.files)"
                           class="w-full border border-gray-300 rounded-md px-3 py-2">
                </div>
            </div>
        `).join('');
    }

    updatePhotoSeries(id, field, value) {
        const series = this.config.photography.find(s => s.id === id);
        if (series) {
            series[field] = value;
        }
    }

    removePhotoSeries(id) {
        this.config.photography = this.config.photography.filter(s => s.id !== id);
        this.renderPhotoSeries();
    }

    handlePhotoUpload(seriesId, files) {
        // In a real implementation, this would upload files to a server
        console.log('Photo upload for series', seriesId, files);
        this.showStatus('Photo upload functionality would be implemented with a backend service', 'info');
    }

    generateCommitHash() {
        return Math.random().toString(36).substring(2, 9);
    }

    loadConfiguration() {
        // Load from localStorage if available
        const saved = localStorage.getItem('websiteConfig');
        if (saved) {
            try {
                this.config = JSON.parse(saved);
                this.populateForm();
            } catch (e) {
                console.error('Error loading configuration:', e);
            }
        }
    }

    populateForm() {
        // Populate profile form
        document.getElementById('profileName').value = this.config.profile.name || '';
        document.getElementById('profileTitle').value = this.config.profile.title || '';
        document.getElementById('profileBio').value = this.config.profile.bio || '';
        document.getElementById('profileLocation').value = this.config.profile.location || '';
        document.getElementById('profileStatus').value = this.config.profile.status || 'available';

        // Populate contact form
        document.getElementById('contactEmail').value = this.config.contact.email || '';
        document.getElementById('contactLinkedIn').value = this.config.contact.linkedin || '';
        document.getElementById('contactGitHub').value = this.config.contact.github || '';
        document.getElementById('contactInstagram').value = this.config.contact.instagram || '';
        document.getElementById('contactYouTube').value = this.config.contact.youtube || '';
        document.getElementById('contactScholar').value = this.config.contact.scholar || '';
    }

    saveConfiguration() {
        // Save to localStorage
        localStorage.setItem('websiteConfig', JSON.stringify(this.config));
    }

    saveAllChanges() {
        // Update config from form values
        this.config.profile.name = document.getElementById('profileName').value;
        this.config.profile.title = document.getElementById('profileTitle').value;
        this.config.profile.bio = document.getElementById('profileBio').value;
        this.config.profile.location = document.getElementById('profileLocation').value;
        this.config.profile.status = document.getElementById('profileStatus').value;

        this.config.contact.email = document.getElementById('contactEmail').value;
        this.config.contact.linkedin = document.getElementById('contactLinkedIn').value;
        this.config.contact.github = document.getElementById('contactGitHub').value;
        this.config.contact.instagram = document.getElementById('contactInstagram').value;
        this.config.contact.youtube = document.getElementById('contactYouTube').value;
        this.config.contact.scholar = document.getElementById('contactScholar').value;

        // Save configuration
        this.saveConfiguration();
        
        // Generate HTML files
        this.generateHTMLFiles();
        
        this.showStatus('Changes saved successfully!', 'success');
    }

    generateHTMLFiles() {
        // This would generate actual HTML files in a real implementation
        // For now, we'll show what would be generated
        console.log('Generated configuration:', this.config);
        
        // In a real implementation, this would:
        // 1. Generate HTML files based on templates
        // 2. Update all pages with new content
        // 3. Commit and push to Git repository
    }

    exportConfiguration() {
        const dataStr = JSON.stringify(this.config, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'website-config.json';
        link.click();
    }

    importConfiguration(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    this.config = JSON.parse(e.target.result);
                    this.populateForm();
                    this.updateLivePreview();
                    this.showStatus('Configuration imported successfully!', 'success');
                } catch (error) {
                    this.showStatus('Error importing configuration: ' + error.message, 'error');
                }
            };
            reader.readAsText(file);
        }
    }

    previewSite() {
        // Open the main site in a new window
        window.open('index.html', '_blank');
    }

    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('statusMessage');
        const statusText = document.getElementById('statusText');
        
        statusText.textContent = message;
        statusEl.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
        }`;
        
        statusEl.classList.remove('hidden');
        
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 3000);
    }
}

// Initialize the website manager when the page loads
let websiteManager;
document.addEventListener('DOMContentLoaded', () => {
    websiteManager = new WebsiteManager();
});
