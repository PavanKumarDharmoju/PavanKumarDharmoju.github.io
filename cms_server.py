#!/usr/bin/env python3
"""
Simple HTTP server for CMS file operations
Handles saving files directly to the project directory
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import urllib.parse

class CMSHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Serve static files"""
        if self.path == '/':
            self.path = '/cms.html'
        
        # Remove query parameters
        path = self.path.split('?')[0]
        
        # Security check - only serve files from current directory
        if '..' in path or path.startswith('/'):
            file_path = path[1:]  # Remove leading slash
        else:
            file_path = path
            
        # Serve the file if it exists
        try:
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f:
                    content = f.read()
                
                # Set appropriate content type
                if file_path.endswith('.html'):
                    content_type = 'text/html'
                elif file_path.endswith('.js'):
                    content_type = 'application/javascript'
                elif file_path.endswith('.css'):
                    content_type = 'text/css'
                elif file_path.endswith('.json'):
                    content_type = 'application/json'
                else:
                    content_type = 'text/plain'
                
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Content-Length', str(len(content)))
                # Add CORS headers for local development
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                self.wfile.write(content)
            else:
                self.send_error(404, f"File not found: {file_path}")
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")

    def do_POST(self):
        """Handle file saving and git operations"""
        if self.path == '/save-file':
            try:
                # Read request body
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                filename = data.get('filename')
                content = data.get('content')
                
                if not filename or content is None:
                    self.send_error(400, "Missing filename or content")
                    return
                
                # Security check - no path traversal
                if '..' in filename or '/' in filename:
                    self.send_error(400, "Invalid filename")
                    return
                
                # Save the file
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                # Send success response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = {
                    'success': True,
                    'message': f'File {filename} saved successfully',
                    'filename': filename
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                
                print(f"✅ Saved file: {filename}")
                
            except Exception as e:
                self.send_error(500, f"Error saving file: {str(e)}")
                
        elif self.path == '/git-commit':
            try:
                # Read request body
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                commit_message = data.get('message', 'feat: update content via CMS')
                
                # Run git commit script
                import subprocess
                result = subprocess.run(
                    ['python3', 'git_commit.py', '-m', commit_message],
                    capture_output=True,
                    text=True,
                    cwd=os.getcwd()
                )
                
                if result.returncode == 0:
                    # Send success response
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    response = {
                        'success': True,
                        'message': 'Changes committed and pushed successfully',
                        'output': result.stdout
                    }
                    self.wfile.write(json.dumps(response).encode('utf-8'))
                    
                    print(f"✅ Git commit successful: {commit_message}")
                else:
                    self.send_error(500, f"Git commit failed: {result.stderr}")
                    
            except Exception as e:
                self.send_error(500, f"Error running git commit: {str(e)}")
                
        else:
            self.send_error(404, "Endpoint not found")

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        """Override to reduce logging noise"""
        pass

def run_server(port=8000):
    """Run the CMS server"""
    server_address = ('', port)
    httpd = HTTPServer(server_address, CMSHandler)
    
    print(f"🚀 CMS Server running on http://localhost:{port}")
    print(f"📝 Open http://localhost:{port}/cms.html to use the CMS")
    print(f"📁 Files will be saved to: {os.getcwd()}")
    print("Press Ctrl+C to stop the server")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Run CMS development server')
    parser.add_argument('--port', '-p', type=int, default=8000, help='Port to run server on (default: 8000)')
    
    args = parser.parse_args()
    run_server(args.port)
