using System;
using System.IO;
using System.Security.Cryptography;
using System.Web.Script.Serialization;
using BouInstaller;

public static class InstallerTests
{
    static int count;
    static void Check(bool value, string name) { if (!value) throw new Exception(name); count++; }
    static void Reject(Action action, string name)
    {
        bool rejected = false;
        try { action(); } catch (Exception) { rejected = true; }
        Check(rejected, name);
    }
    public static void Main()
    {
        var serializer = new JavaScriptSerializer();
        var r = new Release { schema = 1, version = "1.1.0", url = "https://github.com/huxhkuh/bou-time/releases/download/v1.1.0/Bou-Time-1.1.0-x64-Setup.exe", sha256 = new string('a', 64), size = 1048576 };
        string json = serializer.Serialize(r);
        Check(Payload.Parse(json).version == "1.1.0", "valid manifest");
        Reject(() => Payload.Parse(json.Replace("https://github.com/", "https://evil.example/")), "foreign host");
        Reject(() => Payload.Parse(json.Replace("https:", "http:")), "unencrypted URL");
        Reject(() => Payload.Parse(json.Replace("huxhkuh/bou-time", "attacker/bou-time")), "foreign repo");
        Reject(() => Payload.Parse(json.Replace("Setup.exe", "Setup.exe?redirect=evil")), "query injection");
        Reject(() => Payload.Parse(json.Replace("v1.1.0/", "v1.0.0/")), "version mismatch");
        Reject(() => Payload.Parse(json.Replace("1048576", "-1")), "negative size");
        Reject(() => Payload.Parse(json.Replace("1048576", "1073741825")), "oversized payload");
        Reject(() => Payload.Parse(json.Replace(new string('a', 64), "invalid")), "invalid hash");
        Reject(() => Payload.Parse("null"), "null manifest");
        Reject(() => Payload.Parse("{"), "invalid JSON");
        Reject(() => Payload.Parse(json.Replace("\"schema\":1", "\"schema\":2")), "unsupported schema");
        var file = Path.GetTempFileName();
        try
        {
            var bytes = new byte[1048576]; new Random(42).NextBytes(bytes); File.WriteAllBytes(file, bytes);
            using (var hash = SHA256.Create()) r.sha256 = BitConverter.ToString(hash.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant();
            Payload.Verify(file, r); count++;
            bytes[1] ^= 0xff; File.WriteAllBytes(file, bytes);
            Reject(() => Payload.Verify(file, r), "tampered file");
            File.WriteAllText(file, "truncated");
            Reject(() => Payload.Verify(file, r), "incomplete download");
        }
        finally { File.Delete(file); }
        Console.WriteLine("Installer validation: " + count + " checks passed.");
    }
}
