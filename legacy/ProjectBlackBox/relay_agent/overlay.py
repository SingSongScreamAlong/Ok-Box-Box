"""
PitBox PTT Overlay
A lightweight, transparent, always-on-top window to show PTT status.
"""
import threading
import time
import tkinter as tk

class PTTOverlay:
    def __init__(self):
        self.root = None
        self.label = None
        self.active = False
        self.running = False
        self.thread = None
        
    def start(self):
        """Start the overlay in a separate thread"""
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._run_gui, daemon=True)
        self.thread.start()
        
    def stop(self):
        """Stop the overlay"""
        self.running = False
        if self.root:
            self.root.quit()
            
    def set_talking(self, talking: bool):
        """Update talking state"""
        self.active = talking
        if self.root and self.label:
            # Schedule visual update on main thread
            self.root.after(0, self._update_visuals)

    def _update_visuals(self):
        """Update UI based on state"""
        if self.active:
            # Green "Mic On"
            self.label.config(text="🎙️ ON AIR", fg="#00ff00", bg="#1a1a1a")
            self.root.deiconify() # Ensure visible
        else:
            # Hide or show muted? Let's hide to be less intrusive
            self.root.withdraw() 
            # OR show muted if preferred:
            # self.label.config(text="🔇", fg="#555555", bg="#1a1a1a")

    def _run_gui(self):
        """Main GUI loop"""
        self.root = tk.Tk()
        self.root.title("PitBox Overlay")
        
        # Remove decoration
        self.root.overrideredirect(True)
        
        # Always on top
        self.root.wm_attributes("-topmost", True)
        self.root.wm_attributes("-transparent", True) # Windows-specific usually
        # Mac transparency might need different handling, but let's try standard
        try:
             self.root.wait_visibility(self.root)
             self.root.wm_attributes("-alpha", 0.8)
        except:
             pass

        # Position (Top Right)
        screen_width = self.root.winfo_screenwidth()
        x = screen_width - 150
        y = 50
        self.root.geometry(f"120x40+{x}+{y}")
        
        # Styling
        self.root.configure(bg="#1a1a1a")
        
        self.label = tk.Label(
            self.root, 
            text="🎙️ ON AIR", 
            font=("Arial", 12, "bold"),
            fg="#00ff00",
            bg="#1a1a1a"
        )
        self.label.pack(expand=True, fill='both')
        
        # Initial state: Hidden
        self.root.withdraw()
        
        self.root.mainloop()

if __name__ == "__main__":
    # Test
    overlay = PTTOverlay()
    overlay.start()
    print("Overlay started. Toggling...")
    try:
        while True:
            overlay.set_talking(True)
            time.sleep(2)
            overlay.set_talking(False)
            time.sleep(2)
    except KeyboardInterrupt:
        overlay.stop()
