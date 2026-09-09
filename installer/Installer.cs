using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Markup;
using Microsoft.Win32;

namespace BouInstaller
{
    public sealed class Release
    {
        public int schema { get; set; }
        public string version { get; set; }
        public string url { get; set; }
        public string sha256 { get; set; }
        public long size { get; set; }
    }

    public static class Payload
    {
        public const string RepositoryUrl = "https://github.com/huxhkuh/tmora";
        public const string ManifestUrl = RepositoryUrl + "/releases/latest/download/windows-release.json";
        public static Release Parse(string json)
        {
            var serializer = new JavaScriptSerializer { MaxJsonLength = 16384 };
            var release = serializer.Deserialize<Release>(json);
            if (release == null || release.schema != 1 ||
                !Regex.IsMatch(release.version ?? "", @"^\d+\.\d+\.\d+$") ||
                !Regex.IsMatch(release.sha256 ?? "", @"^[a-fA-F0-9]{64}$") ||
                release.size < 1048576 || release.size > 1073741824)
                throw new InvalidDataException("פרטי הגרסה שהתקבלו אינם תקינים.");
            string assetPath = "/releases/download/v" + release.version +
                "/Bou-Time-" + release.version + "-x64-Setup.exe";
            string expected = RepositoryUrl + assetPath;
            // Old bootstrapper copies require the old URL in the shared manifest.
            // Accept that exact compatibility path, then download from the renamed repo.
            string legacy = "https://github.com/huxhkuh/bou-time" + assetPath;
            if (release.url != expected && release.url != legacy)
                throw new InvalidDataException("כתובת ההורדה אינה תואמת למאגר הרשמי.");
            release.url = expected;
            return release;
        }

        public static void Verify(string file, Release release)
        {
            if (new FileInfo(file).Length != release.size)
                throw new InvalidDataException("ההורדה אינה שלמה. אפשר לנסות שוב.");
            using (var stream = File.OpenRead(file))
            using (var hash = SHA256.Create())
            {
                var actual = BitConverter.ToString(hash.ComputeHash(stream)).Replace("-", "");
                if (!String.Equals(actual, release.sha256, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidDataException("בדיקת תקינות הקובץ נכשלה. הקובץ לא הופעל.");
            }
        }

        public static string InstallDirectory()
        {
            // Keep an existing per-user install location when updating.
            // electron-builder's stable GUID for il.bou.time. NSIS stores this
            // separately from the uninstall entry (whose name includes a version).
            using (var key = Registry.CurrentUser.OpenSubKey(@"Software\3ead69c5-dfef-56f1-9730-ce3cff6c6279"))
            {
                var location = key == null ? null : key.GetValue("InstallLocation") as string;
                if (!String.IsNullOrWhiteSpace(location) && Path.IsPathRooted(location)) return location;
            }
            return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "Bou Time");
        }

        public static bool IsRunning(string directory)
        {
            var expected = Path.Combine(directory, "Bou Time.exe");
            foreach (var process in Process.GetProcessesByName("Bou Time"))
                using (process)
                {
                    try { if (String.Equals(process.MainModule.FileName, expected, StringComparison.OrdinalIgnoreCase)) return true; }
                    catch (System.ComponentModel.Win32Exception) { return true; }
                    catch (InvalidOperationException) { }
                }
            return false;
        }
    }

    public sealed class Installer
    {
        Window window;
        TextBlock heading, description, status, detail, note;
        Button primary, secondary;
        ProgressBar progress;
        CancellationTokenSource cancellation;
        bool busy, installing, completed;
        string directory;

        [STAThread]
        public static void Main()
        {
            bool first;
            using (var mutex = new Mutex(true, @"Local\BouTimeBootstrapper", out first))
            {
                if (!first) { MessageBox.Show("מתקין תמורה כבר פתוח.", "תמורה"); return; }
                try
                {
                    ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
                    var app = new Application();
                    var installer = new Installer();
                    installer.CreateWindow();
                    app.Run(installer.window);
                }
                catch (Exception) { MessageBox.Show("לא ניתן לפתוח את המתקין. נסה להוריד אותו שוב מעמוד הגרסאות ב־GitHub.", "תמורה"); }
            }
        }

        void CreateWindow()
        {
            using (var resource = Assembly.GetExecutingAssembly().GetManifestResourceStream("Installer.xaml"))
                window = (Window)XamlReader.Load(resource);
            heading = (TextBlock)window.FindName("Heading");
            description = (TextBlock)window.FindName("Description");
            status = (TextBlock)window.FindName("Status");
            detail = (TextBlock)window.FindName("Detail");
            note = (TextBlock)window.FindName("Note");
            progress = (ProgressBar)window.FindName("Progress");
            primary = (Button)window.FindName("Primary");
            secondary = (Button)window.FindName("Secondary");
            directory = Payload.InstallDirectory();
            primary.Click += async (sender, args) =>
            {
                if (completed)
                {
                    try { Process.Start(new ProcessStartInfo(Path.Combine(directory, "Bou Time.exe")) { UseShellExecute = true }); window.Close(); }
                    catch (Exception) { detail.Text = "לא ניתן לפתוח את האפליקציה. אפשר לפתוח את תמורה מתפריט ההתחלה."; }
                }
                else await Install();
            };
            secondary.Click += (sender, args) => { if (busy) cancellation.Cancel(); else window.Close(); };
            window.Closing += (sender, args) =>
            {
                if (busy)
                {
                    args.Cancel = true;
                    if (!installing) cancellation.Cancel();
                    else detail.Text = "ההתקנה מתבצעת. החלון יאפשר סגירה כשהיא תסתיים.";
                }
            };
            if (!Environment.Is64BitOperatingSystem)
            {
                status.Text = "נדרשת מערכת Windows של 64 סיביות";
                detail.Text = "גרסה זו אינה מתאימה למערכת של 32 סיביות.";
                primary.IsEnabled = false;
            }
        }

        async Task Install()
        {
            if (busy) return;
            busy = true;
            primary.IsEnabled = false;
            secondary.Content = "ביטול";
            cancellation = new CancellationTokenSource();
            var token = cancellation.Token;
            string scratch = null;
            try
            {
                if (Payload.IsRunning(directory)) throw new InvalidOperationException("תמורה פתוחה. סגור את האפליקציה ונסה שוב; זמן המדידה נשמר.");
                heading.Text = "מפנים מקום לעבודה טובה.";
                description.Text = "הגרסה הרשמית בדרך למחשב שלך. נשמור על הנתונים הקיימים גם אם זו התקנה חוזרת.";
                status.Text = "1 מתוך 3 · בודקים את הגרסה העדכנית";
                detail.Text = "מתחברים למאגר של תמורה ב־GitHub…";
                progress.Visibility = Visibility.Visible;
                progress.IsIndeterminate = true;
                Release release;
                using (var client = new HttpClient { Timeout = TimeSpan.FromMinutes(20) })
                {
                    client.DefaultRequestHeaders.UserAgent.ParseAdd("Bou-Installer/1.0");
                    // Bound the small manifest independently from the large payload.
                    using (var timeout = CancellationTokenSource.CreateLinkedTokenSource(token))
                    {
                        timeout.CancelAfter(TimeSpan.FromSeconds(45));
                        using (var response = await client.GetAsync(Payload.ManifestUrl, HttpCompletionOption.ResponseHeadersRead, timeout.Token))
                        {
                            response.EnsureSuccessStatusCode();
                            using (var source = await response.Content.ReadAsStreamAsync())
                            using (var memory = new MemoryStream())
                            {
                                byte[] bytes = new byte[4096];
                                int read;
                                while ((read = await source.ReadAsync(bytes, 0, bytes.Length, timeout.Token)) > 0)
                                {
                                    if (memory.Length + read > 16384) throw new InvalidDataException("קובץ הגרסה גדול מהצפוי.");
                                    memory.Write(bytes, 0, read);
                                }
                                release = Payload.Parse(System.Text.Encoding.UTF8.GetString(memory.ToArray()).TrimStart('\uFEFF'));
                            }
                        }
                    }
                    status.Text = "1 מתוך 3 · מורידים את תמורה " + release.version;
                    progress.IsIndeterminate = false;
                    progress.Value = 0;
                    scratch = Path.Combine(Path.GetTempPath(), "BouInstall-" + Guid.NewGuid().ToString("N"));
                    Directory.CreateDirectory(scratch);
                    string payload = Path.Combine(scratch, "Bou-Setup.exe");
                    using (var response = await client.GetAsync(release.url, HttpCompletionOption.ResponseHeadersRead, token))
                    {
                        response.EnsureSuccessStatusCode();
                        if (response.Content.Headers.ContentLength.HasValue && response.Content.Headers.ContentLength.Value != release.size)
                            throw new InvalidDataException("גודל ההורדה אינו תואם לגרסה שפורסמה.");
                        using (var source = await response.Content.ReadAsStreamAsync())
                        using (var target = new FileStream(payload, FileMode.CreateNew, FileAccess.Write, FileShare.None, 65536, true))
                        {
                            byte[] buffer = new byte[65536]; long total = 0; int count;
                            var clock = Stopwatch.StartNew();
                            while ((count = await source.ReadAsync(buffer, 0, buffer.Length, token)) > 0)
                            {
                                total += count;
                                if (total > release.size) throw new InvalidDataException("ההורדה גדולה מהצפוי. הקובץ לא הופעל.");
                                await target.WriteAsync(buffer, 0, count, token);
                                if (clock.ElapsedMilliseconds > 100 || total == release.size)
                                {
                                    progress.Value = 100.0 * total / release.size;
                                    detail.Text = String.Format("{0:0.0} מתוך {1:0.0} MB · {2:0}%", total / 1048576.0, release.size / 1048576.0, progress.Value);
                                    clock.Restart();
                                }
                            }
                        }
                    }
                    token.ThrowIfCancellationRequested();
                    status.Text = "2 מתוך 3 · מוודאים שהקובץ תקין";
                    detail.Text = "בדיקת SHA-256 לפני ההתקנה…";
                    progress.IsIndeterminate = true;
                    await Task.Run(() => Payload.Verify(payload, release));
                    token.ThrowIfCancellationRequested();
                    if (Payload.IsRunning(directory)) throw new InvalidOperationException("תמורה פתוחה. סגור את האפליקציה ונסה שוב.");
                    installing = true;
                    secondary.IsEnabled = false;
                    status.Text = "3 מתוך 3 · מתקינים בחשבון שלך";
                    detail.Text = "יוצרים קיצור דרך ומכינים את סביבת העבודה…";
                    note.Text = "הנתונים האישיים נשמרים במחשב, בתיקיית AppData של המשתמש שלך.";
                    // NSIS requires /D to be the final argument, without quotes even for spaces.
                    using (var process = Process.Start(new ProcessStartInfo(payload, "/S /currentuser /D=" + directory) { UseShellExecute = false }))
                    {
                        await Task.Run(() => process.WaitForExit());
                        if (process.ExitCode != 0) throw new InvalidOperationException("ההתקנה לא הושלמה (קוד " + process.ExitCode + "). אפשר לנסות שוב.");
                    }
                    if (!File.Exists(Path.Combine(directory, "Bou Time.exe"))) throw new InvalidOperationException("לא נמצא קובץ האפליקציה לאחר ההתקנה.");
                    completed = true;
                    heading.Text = "יש לך זמן לדברים הטובים.";
                    description.Text = "תמורה מותקנת ומוכנה. אפשר להתחיל בפרויקט הראשון שלך, או לייבא גיבוי קיים מתוך ההגדרות.";
                    status.Text = "ההתקנה הושלמה בהצלחה";
                    detail.Text = "גרסה " + release.version + " · קיצור דרך נוסף לתפריט ההתחלה ולשולחן העבודה";
                    progress.IsIndeterminate = false;
                    progress.Value = 100;
                    primary.Content = "פתיחת תמורה";
                }
            }
            catch (OperationCanceledException)
            {
                status.Text = token.IsCancellationRequested ? "ההורדה בוטלה" : "החיבור לשרת נמשך זמן רב מדי";
                detail.Text = "לא הופעל קובץ התקנה. אפשר לנסות שוב כשנוח לך.";
                progress.Visibility = Visibility.Collapsed;
            }
            catch (Exception error)
            {
                status.Text = "לא הצלחנו להשלים את ההתקנה";
                detail.Text = error is InvalidDataException || error is InvalidOperationException ? error.Message :
                    "בדוק חיבור לאינטרנט, מקום פנוי והרשאות כתיבה. אם הבעיה נמשכת, הורד את המתקין המלא מעמוד הגרסאות ב־GitHub.";
                progress.Visibility = Visibility.Collapsed;
            }
            finally
            {
                busy = false; installing = false;
                primary.IsEnabled = true; secondary.IsEnabled = true; secondary.Content = "סגירה";
                if (!completed) primary.Content = "ניסיון נוסף";
                cancellation.Dispose();
                if (scratch != null)
                {
                    try { Directory.Delete(scratch, true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
                }
            }
        }
    }
}
