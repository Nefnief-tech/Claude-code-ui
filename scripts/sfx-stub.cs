// Self-extracting stub for cc-uui Windows installer
// Compile: csc -out:sfx.exe -target:winexe sfx-stub.cs
// Then append: copy /b sfx.exe + payload.zip cc-uui-windows-x64.exe
//
// The exe reads itself, finds the PAYLOAD_MARKER, extracts the zip
// to %LOCALAPPDATA%\cc-uui, and launches the app.

using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;

class Program
{
    static readonly byte[] Marker = System.Text.Encoding.ASCII.GetBytes("__CCUUI_PAYLOAD__");
    static readonly string InstallDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "cc-uui");

    [STAThread]
    static void Main(string[] args)
    {
        bool force = false;
        bool uninstall = false;
        bool help = false;

        foreach (var arg in args)
        {
            switch (arg.ToLower())
            {
                case "--install": case "-i": force = true; break;
                case "--uninstall": case "-u": uninstall = true; break;
                case "--help": case "-h": help = true; break;
            }
        }

        if (help)
        {
            Console.WriteLine("cc-uui — AI coding assistant");
            Console.WriteLine();
            Console.WriteLine("  (no args)    Install & launch (first run) or just launch");
            Console.WriteLine("  --install    Force re-install");
            Console.WriteLine("  --uninstall  Remove cc-uui");
            Console.WriteLine("  --help       Show this help");
            return;
        }

        if (uninstall)
        {
            if (Directory.Exists(InstallDir))
            {
                Directory.Delete(InstallDir, true);
                Console.WriteLine("cc-uui removed.");
            }
            RemoveShortcut();
            return;
        }

        string launcherPath = Path.Combine(InstallDir, "bin", "launcher.exe");

        if (force || !File.Exists(launcherPath))
        {
            Console.WriteLine("Installing cc-uui to " + InstallDir + " ...");
            Directory.CreateDirectory(InstallDir);

            byte[] selfBytes = File.ReadAllBytes(Assembly.GetExecutingAssembly().Location);
            int markerPos = FindMarker(selfBytes);
            if (markerPos < 0)
            {
                Console.Error.WriteLine("Error: no embedded payload found.");
                Environment.Exit(1);
                return;
            }

            string tempZip = Path.Combine(Path.GetTempPath(), "cc-uui-payload.zip");
            using (var fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
            {
                fs.Write(selfBytes, markerPos + Marker.Length, selfBytes.Length - markerPos - Marker.Length);
            }

            // Extract with overwrite support
            using (var archive = ZipFile.OpenRead(tempZip))
            {
                foreach (var entry in archive.Entries)
                {
                    string dest = Path.Combine(InstallDir, entry.FullName);
                    string dir = Path.GetDirectoryName(dest);
                    if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);
                    if (entry.Name.Length > 0)
                        entry.ExtractToFile(dest, true);
                }
            }
            File.Delete(tempZip);

            CreateShortcut();
            Console.WriteLine("Installed. Launching...");
        }

        var psi = new ProcessStartInfo(launcherPath)
        {
            WorkingDirectory = Path.GetDirectoryName(launcherPath)
        };
        // Pass through any non-flag args
        foreach (var arg in args)
        {
            if (!arg.StartsWith("-")) psi.ArgumentList.Add(arg);
        }
        Process.Start(psi);
    }

    static int FindMarker(byte[] data)
    {
        for (int i = 0; i <= data.Length - Marker.Length; i++)
        {
            bool match = true;
            for (int j = 0; j < Marker.Length; j++)
            {
                if (data[i + j] != Marker[j]) { match = false; break; }
            }
            if (match) return i;
        }
        return -1;
    }

    static void CreateShortcut()
    {
        try
        {
            string shortcutDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Microsoft", "Windows", "Start Menu", "Programs");
            string shortcutPath = Path.Combine(shortcutDir, "cc-uui.lnk");

            Type shellType = Type.GetTypeFromProgID("WScript.Shell");
            dynamic shell = Activator.CreateInstance(shellType);
            dynamic shortcut = shell.CreateShortcut(shortcutPath);
            shortcut.TargetPath = Path.Combine(InstallDir, "bin", "launcher.exe");
            shortcut.WorkingDirectory = Path.Combine(InstallDir, "bin");
            shortcut.Description = "cc-uui — AI coding assistant";
            shortcut.Save();
        }
        catch { /* shortcut creation is best-effort */ }
    }

    static void RemoveShortcut()
    {
        try
        {
            string shortcutPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Microsoft", "Windows", "Start Menu", "Programs", "cc-uui.lnk");
            if (File.Exists(shortcutPath)) File.Delete(shortcutPath);
        }
        catch { }
    }
}
