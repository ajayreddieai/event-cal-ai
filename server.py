#!/usr/bin/env python3
"""
Simple HTTP server to serve the Event Discovery Calendar App
"""
import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    print("🚀 Starting Event Discovery Calendar App...")
    print(f"📱 Server will be available at: http://localhost:{PORT}")
    print("🎯 Features:")
    print("  ✅ Interactive calendar with clickable days")
    print("  ✅ Color-coded events by category")
    print("  ✅ Beautiful modern UI")
    print("  ✅ Event details and statistics")
    print()
    print("🌐 Opening browser...")
    print()

    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print(f"✅ Server running at http://localhost:{PORT}")
            print("🎉 Your Event Discovery Calendar is live!")
            print()
            print("Click on calendar days to see events!")
            print("Press Ctrl+C to stop the server")
            print()

            # Try to open browser automatically
            try:
                webbrowser.open(f'http://localhost:{PORT}')
                print("📱 Browser opened automatically!")
            except:
                print(f"🌐 Please open http://localhost:{PORT} in your browser")

            httpd.serve_forever()

    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use")
            print(f"💡 Try stopping other applications or use a different port")
        else:
            print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
