# Privacy policy / מדיניות פרטיות

Temura (תמורה), maintained at https://github.com/huxhkuh/bou-time, is a personal time tracker. This policy describes the application and Windows installer, not GitHub's website or SignPath's application form.

## Personal work data

Client names, project descriptions, rates, tasks, time entries and active timers are stored locally in IndexedDB. The Windows app uses `%APPDATA%\BouTime`; the web app uses the current browser's storage. Temura does not upload this work data to the maintainer, GitHub or a cloud account. There is no advertising, analytics SDK, remote crash-reporting service or account registration in the app. Fonts are bundled locally.

Backups and CSV exports are created only at the user's request and saved to a location the user chooses. They are not encrypted by Temura. Anyone with access to these files, or sufficient access to the local Windows/browser profile, may read them. Import reads a selected local backup. Uninstalling preserves application data; users who want to erase it must remove their local profile and separately saved exports after closing the app.

## Network requests

The small Windows installer contacts GitHub and its download infrastructure when the user starts installation. In-app update checks and downloads also contact GitHub when requested by the user. Requests expose normal network information such as IP address, request headers and the requested release files. The updater can send a locally generated staging identifier (`x-user-staging-id`) used by electron-updater for update rollouts; this is not client/project/time-entry data. No work records are attached to these requests. The full offline installer supports installation without downloading the application payload.

GitHub handles these requests under its [privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Using the web version also requires downloading the app from the host serving it; that host may keep ordinary access logs. Working time can be tracked offline after the application has loaded or been installed.

## Contact and third parties

Public issues and discussions on GitHub are public. Do not attach personal backups, client details or credentials when requesting help. See [SECURITY.md](SECURITY.md) for security-reporting guidance. SignPath, if it approves the project, handles developer/build signing information under its own [privacy policy](https://signpath.io/privacy-policy); signing does not require uploading users' work data.

## תמצית בעברית

הלקוחות, הפרויקטים, התעריפים, המשימות והשעות נשמרים במכשיר בלבד. האפליקציה אינה שולחת אותם אלינו, ל־GitHub או ל־SignPath. התקנה מקוונת ובדיקת עדכונים פונות ל־GitHub לפי בקשת המשתמש; הספק מקבל פרטי תקשורת רגילים, ומנגנון העדכון עשוי להעביר מזהה מקומי שנוצר עבור עדכונים. אין איסוף נתוני שימוש לצורכי פרסום או אנליטיקה. קובצי גיבוי וייצוא אינם מוצפנים, והסרת ההתקנה אינה מוחקת את הנתונים האישיים. אל תפרסמו גיבויים או פרטי לקוחות בפניות ציבוריות.
