<center>

# Steam Widget Updater
#### I'd appreciate it if you could give my project a star :) ⭐

</center>

A GitHub Actions-based Steam stats fetcher that automatically updates a Discord application profile widget.

Runs daily or manually via workflow dispatch.

### Preview
<img src="preview.png" width="400px">

---

## Importing the Discord Widget

This repository includes a pre-configured widget layout file: [widget-layout.json](https://github.com/ItsDenji777/SteamWidgetUpdater/blob/main/widget-layout.json)

This file is used only for importing the widget layout into Discord. It is not required for the Node.js script to run.

---

### How to import the widget

1. Open the Discord Previews server thread:
   
   https://discord.com/channels/603970300668805120/1520805824040013976/threads/1521122189993050183/1521122189993050183

2. Locate the widget import tool provided in the thread (Discord Widget Extension).

3. Open the widget import window.

4. Open the file in this repository: [widget-layout.json](https://github.com/ItsDenji777/SteamWidgetUpdater/blob/main/widget-layout.json)

5. Copy the entire contents of the file.

6. Paste it into the widget import window.

7. Click **Import**.

> [!IMPORTANT]
> - This file only defines the layout and data bindings.
> - It does NOT contain your Steam or Discord credentials.
> - The Node.js script is responsible for providing live data to this widget.
> - If the widget layout is updated in the future, re-importing may be required.


---

## Quick Start (Fork & Use)

### 1. Fork this repository

Click the Fork button on GitHub (top right).

Then clone your fork (optional):

```bash
git clone https://github.com/YOUR_USERNAME/SteamWidgetUpdater.git
cd SteamWidgetUpdater
````

---

### 2. Add GitHub Secrets

Go to:

`
Settings → Secrets and variables → Actions → New repository secret
`

Add the following:

| Secret          | Description            |
| --------------- | ---------------------- |
| STEAM_API_KEY   | Steam Web API key      |
| STEAM_ID        | Your SteamID64         |
| BOT_TOKEN       | Discord bot token      |
| APPLICATION_ID  | Discord application ID |
| DISCORD_USER_ID | Your Discord user ID   |

>[!IMPORTANT]
>* Do not use quotes
>* Do not use `{}` placeholders
>* Paste raw values only

---

### 3. Enable GitHub Actions

Go to:

`
Actions → Enable workflows
`

Approve if prompted.

---

### 4. Run manually (first test)

Go to:

`
Actions → Update Steam Widget → Run workflow
`

>[!TIP]
> #### Check logs for:
> * Steam data fetched
> * Stats calculated
> * Discord update successful

---

## Automatic Updates

Runs every 1 day (UTC):

```yaml
0 0 */1 * *
```

---

## What it does

Each run:

1. Fetches Steam profile data
2. Calculates:

   * Total playtime
   * Recent 2-week playtime
   * Most played game
   * Steam level
   * Friends count
   * Badge count
   * Profile age
3. Builds widget payload
4. Sends PATCH request to Discord API
5. Updates your profile widget

---

## Requirements

* Steam profile must be accessible via Steam Web API (Meaning public Friends List and etc.)
* Valid Steam Web API key (Get one [here!](https://steamcommunity.com/dev/apikey))
* Discord application with widget support
* GitHub Actions enabled

---
## Common Issues

### Missing secrets error

GitHub Secrets were not configured correctly.

### Steam API error (403 / 401)

Invalid Steam API key or Steam ID.

### Discord API 400 error

Incorrect APPLICATION_ID or DISCORD_USER_ID.

### Workflow not running automatically

* Must be on default branch
* GitHub cron may have delays

---
>[!WARNING]
>* Never hardcode secrets in code
>* Never commit .env files
>* Always use GitHub Secrets