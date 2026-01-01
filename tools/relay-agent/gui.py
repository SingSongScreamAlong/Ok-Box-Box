#!/usr/bin/env python3
import sys
import subprocess
import threading
import tkinter as tk
from tkinter import messagebox
import customtkinter as ctk
from PIL import Image
import os
import signal
from settings_manager import SettingsManager

# Theme
ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class RelayGUI(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("PitBox Relay Agent")
        self.geometry("600x500")
        
        self.settings = SettingsManager()
        self.agent_process = None
        
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        # Tab View
        self.tab_view = ctk.CTkTabview(self)
        self.tab_view.grid(row=0, column=0, padx=20, pady=20, sticky="nsew")
        
        self.tab_home = self.tab_view.add("Dashboard")
        self.tab_config = self.tab_view.add("Configuration")
        
        self.setup_home_tab()
        self.setup_config_tab()
        
    def setup_home_tab(self):
        self.tab_home.grid_columnconfigure(0, weight=1)
        
        # Header
        self.lbl_status = ctk.CTkLabel(
            self.tab_home, 
            text="STATUS: STOPPED", 
            font=("Roboto Medium", 20),
            text_color="red"
        )
        self.lbl_status.grid(row=0, column=0, pady=20)
        
        # Start/Stop Button
        self.btn_toggle = ctk.CTkButton(
            self.tab_home,
            text="START AGENT",
            command=self.toggle_agent,
            height=50,
            font=("Roboto Medium", 16)
        )
        self.btn_toggle.grid(row=1, column=0, pady=10, padx=50, sticky="ew")
        
        # Log Output
        self.log_box = ctk.CTkTextbox(self.tab_home, height=200)
        self.log_box.grid(row=2, column=0, pady=20, padx=20, sticky="nsew")
        self.log_box.insert("0.0", "Ready to start.\n")
        self.log_box.configure(state="disabled")

    def setup_config_tab(self):
        self.tab_config.grid_columnconfigure(1, weight=1)
        
        current_config = self.settings.load()
        self.entries = {}
        
        fields = [
            ("Server URL", "BLACKBOX_SERVER_URL"),
            ("Relay ID", "RELAY_ID"),
            ("PTT Key", "PTT_KEY"),
            ("Joystick ID", "JOYSTICK_ID"),
            ("Joystick Button", "JOYSTICK_BUTTON")
        ]
        
        row = 0
        for label, key in fields:
            lbl = ctk.CTkLabel(self.tab_config, text=label)
            lbl.grid(row=row, column=0, padx=20, pady=10, sticky="w")
            
            entry = ctk.CTkEntry(self.tab_config)
            entry.insert(0, current_config.get(key, ""))
            entry.grid(row=row, column=1, padx=20, pady=10, sticky="ew")
            self.entries[key] = entry
            row += 1
            
        # PTT Type Dropdown
        lbl = ctk.CTkLabel(self.tab_config, text="PTT Type")
        lbl.grid(row=row, column=0, padx=20, pady=10, sticky="w")
        
        self.ptt_type_var = ctk.StringVar(value=current_config.get("PTT_TYPE", "keyboard"))
        self.opt_ptt = ctk.CTkOptionMenu(
            self.tab_config,
            values=["keyboard", "joystick"],
            variable=self.ptt_type_var
        )
        self.opt_ptt.grid(row=row, column=1, padx=20, pady=10, sticky="ew")
        row += 1
        
        # Save Button
        self.btn_save = ctk.CTkButton(
            self.tab_config,
            text="Save Settings",
            command=self.save_settings
        )
        self.btn_save.grid(row=row, column=1, pady=30, padx=20, sticky="e")

    def log(self, message):
        self.log_box.configure(state="normal")
        self.log_box.insert("end", message + "\n")
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    def save_settings(self):
        new_settings = {}
        for key, entry in self.entries.items():
            new_settings[key] = entry.get()
        new_settings["PTT_TYPE"] = self.ptt_type_var.get()
        
        self.settings.save(new_settings)
        messagebox.showinfo("Success", "Settings saved successfully.")
        self.log("Settings updated.")

    def toggle_agent(self):
        if self.agent_process and self.agent_process.poll() is None:
            # STOP
            self.log("Stopping agent...")
            if sys.platform == 'win32':
                self.agent_process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                self.agent_process.send_signal(signal.SIGTERM)
            
            self.agent_process.wait(timeout=2)
            self.agent_process = None
            
            self.lbl_status.configure(text="STATUS: STOPPED", text_color="red")
            self.btn_toggle.configure(text="START AGENT", fg_color="#1f538d", hover_color="#14375e") # restore default blue
        else:
            # START
            self.log("Starting agent...")
            
            # Start process
            try:
                # Use sys.executable to ensure we use the same python interpreter (vrenv)
                cmd = [sys.executable, "-u", "main.py"]
                cwd = os.path.dirname(os.path.abspath(__file__))
                
                self.agent_process = subprocess.Popen(
                    cmd,
                    cwd=cwd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
                )
                
                self.lbl_status.configure(text="STATUS: RUNNING", text_color="green")
                self.btn_toggle.configure(text="STOP AGENT", fg_color="red", hover_color="darkred")
                
                # Start thread to read output
                threading.Thread(target=self._read_process_output, daemon=True).start()
                
            except Exception as e:
                self.log(f"Error starting agent: {e}")
                
    def _read_process_output(self):
        while self.agent_process and self.agent_process.poll() is None:
            line = self.agent_process.stdout.readline()
            if line:
                # self.log(line.strip()) # Use callback to main thread ideally, but Tkinter usually handles this ok-ish
                # But safer to use after()
                self.after(0, lambda l=line.strip(): self.log(l))
        
        # Process ended
        self.after(0, lambda: self.lbl_status.configure(text="STATUS: STOPPED", text_color="red"))
        self.after(0, lambda: self.btn_toggle.configure(text="START AGENT", fg_color="#1f538d", hover_color="#14375e"))

    def on_closing(self):
        if self.agent_process:
            self.agent_process.kill()
        self.destroy()

if __name__ == "__main__":
    app = RelayGUI()
    app.protocol("WM_DELETE_WINDOW", app.on_closing)
    app.mainloop()
