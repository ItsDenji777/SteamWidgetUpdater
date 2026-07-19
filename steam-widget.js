// Steam → Discord Widget Updater
// Runs in GitHub Actions

// Environment Variables

const {
    STEAM_API_KEY,
    STEAM_ID,
    BOT_TOKEN,
    APPLICATION_ID,
    DISCORD_USER_ID
} = process.env;

// Validate Secrets

const requiredSecrets = [
    "STEAM_API_KEY",
    "STEAM_ID",
    "BOT_TOKEN",
    "APPLICATION_ID",
    "DISCORD_USER_ID"
];

console.log("Validating required secrets...");
for (const secret of requiredSecrets) {
    if (!process.env[secret]) {
        console.error("✗ Missing GitHub Secret: " + secret);
        throw new Error(`Missing GitHub Secret: ${secret}`);
    }
}
console.log("✓ All required secrets present.");

// Logging

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

// Delay Helper

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch JSON with Retries

async function steam(url, retries = 3) {
    let lastError;

    const endpoint = url.split('?')[0];
    console.log(`→ Steam API request: ${endpoint}...`);

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`  Attempt ${attempt}/${retries}`);
            const res = await fetch(url);

            if (!res.ok) {
                const text = await res.text();
                console.error(`  ✗ Steam API returned ${res.status}: ${text.substring(0, 200)}`);
                throw new Error(
                    `Steam API ${res.status}\n${text}`
                );
            }

            const data = await res.json();
            console.log(`  ✓ Successful response (status ${res.status})`);
            return data;

        } catch (err) {
            lastError = err;
            log(`Steam request failed (${attempt}/${retries})`);
            console.error(`  ⚠ Error details: ${err.message}`);

            if (attempt !== retries) {
                console.log(`  Waiting 1.5s before retry...`);
                await delay(1500);
            }
        }
    }

    console.error("✗ All retries exhausted. Throwing final error.");
    throw lastError;
}

// Account Age

async function getProfileAge() {
    console.log("→ Fetching profile age from Steam community...");
    try {
        const response = await fetch(
            `https://steamcommunity.com/profiles/${STEAM_ID}/?xml=1`
        );

        if (!response.ok) {
            console.warn(`⚠ Profile XML request failed with status ${response.status}`);
            return "Unknown";
        }

        const xml = await response.text();
        console.log("  XML response received, parsing memberSince...");

        const match = xml.match(
            /<memberSince>(.*?)<\/memberSince>/
        );

        if (!match) {
            console.warn("⚠ Could not find memberSince tag in XML");
            return "Unknown";
        }

        const created = new Date(match[1]);

        if (isNaN(created)) {
            console.warn(`⚠ Invalid creation date parsed: ${match[1]}`);
            return "Unknown";
        }

        console.log(`  Profile creation date: ${created.toISOString()}`);

        const now = new Date();
        let years =
            now.getFullYear() -
            created.getFullYear();

        const monthDiff =
            now.getMonth() -
            created.getMonth();

        if (
            monthDiff < 0 ||
            (
                monthDiff === 0 &&
                now.getDate() < created.getDate()
            )
        ) {
            years--;
        }

        const ageText = `${years} Years`;
        console.log(`  Calculated profile age: ${ageText}`);
        return ageText;

    } catch (err) {
        console.error("✗ Error fetching profile age:", err.message);
        return "Unknown";
    }
}

// Discord Widget Updater

async function updateDiscordWidget(widget) {
    console.log("→ Updating Discord widget...");
    console.log(`  Payload keys: ${Object.keys(widget.data).join(', ')}`);
    console.log(`  Dynamic fields count: ${widget.data.dynamic.length}`);

    const response = await fetch(
        `https://discord.com/api/v9/applications/${APPLICATION_ID}/users/${DISCORD_USER_ID}/identities/0/profile`,
        {
            method: "PATCH",
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`,
                "Content-Type": "application/json",
                "User-Agent":
                    "DiscordBot (https://github.com/discord/discord-api-docs, 1.0.0)"
            },
            body: JSON.stringify(widget)
        }
    );

    if (!response.ok) {
        const text = await response.text();
        console.error(`✗ Discord API error ${response.status}: ${text.substring(0, 200)}`);
        throw new Error(
            `Discord API ${response.status}\n${text}`
        );
    }

    console.log(`✓ Discord widget updated successfully (status ${response.status})`);
    log("Discord widget updated.");
}

// Main

async function main() {
    console.log("▶ Starting Steam → Discord widget update...");
    log("Fetching Steam data...");

    const [
        summary,
        owned,
        recent,
        level,
        badges,
        friendsRaw,
        profileAge
    ] = await Promise.all([
        steam(
            `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${STEAM_ID}`
        ),
        steam(
            `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&include_appinfo=1&include_played_free_games=1`
        ),
        steam(
            `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}`
        ),
        steam(
            `https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}`
        ),
        steam(
            `https://api.steampowered.com/IPlayerService/GetBadges/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}`
        ),
        steam(
            `https://api.steampowered.com/ISteamUser/GetFriendList/v1/?key=${STEAM_API_KEY}&steamid=${STEAM_ID}&relationship=friend`
        ),
        getProfileAge()
    ]);

    console.log("✓ All Steam data fetched successfully.");

    log("Calculating statistics...");

    const player = summary.response.players?.[0];
    console.log(`Player: ${player?.personaname || "Unknown"} (${STEAM_ID})`);

    const games = owned.response.games || [];
    console.log(`Owned games data: ${games.length} entries`);

    const recentGames = recent.response.games || [];
    console.log(`Recent games data: ${recentGames.length} entries`);

    // Overall playtime
    const totalMinutes = games.reduce(
        (sum, game) => sum + (game.playtime_forever || 0),
        0
    );
    const totalPlaytimeMs = totalMinutes * 60000;
    console.log(`Total playtime: ${totalMinutes} minutes (${(totalMinutes / 60).toFixed(1)} hours)`);

    // Most Played Game
    let mostPlayed = null;
    if (games.length > 0) {
        mostPlayed = games.reduce((highest, current) => {
            if (
                (current.playtime_forever || 0) >
                (highest.playtime_forever || 0)
            ) {
                return current;
            }
            return highest;
        });
        console.log(`Most played game: ${mostPlayed?.name || "Unknown"} (${mostPlayed?.playtime_forever} min)`);
    } else {
        console.log("Most played game: none (empty library)");
    }

    // Two Week Playtime
    const recentMinutes = recentGames.reduce(
        (sum, game) => sum + (game.playtime_2weeks || 0),
        0
    );
    const recentPlaytimeMs = recentMinutes * 60000;
    console.log(`Recent 2-week playtime: ${recentMinutes} minutes (${(recentMinutes / 60).toFixed(1)} hours)`);

    // Friends Count
    const friendCount = friendsRaw.friendslist?.friends?.length || 0;
    console.log(`Friend count: ${friendCount}`);

    // Badges Count
    const badgeCount = badges.response?.badges?.length || 0;
    console.log(`Badge count: ${badgeCount}`);

    // Owned Games
    const ownedGames = games.length;
    console.log(`Owned games total: ${ownedGames}`);

    // Steam Level
    const steamLevel = level.response.player_level || 0;
    console.log(`Steam level: ${steamLevel}`);

    // Console Summary
    log("-----------------------------");
    log(`User: ${player?.personaname}`);
    log(`Steam Level: ${steamLevel}`);
    log(`Owned Games: ${ownedGames}`);
    log(`Friends: ${friendCount}`);
    log(`Badges: ${badgeCount}`);
    log(`Profile Age: ${profileAge}`);
    log(`Most Played: ${mostPlayed?.name ?? "None"}`);
    log("-----------------------------");

    log("Building widget payload...");
    const widget = {
        data: {
            dynamic: [
                {
                    type: 1,
                    name: "display_name",
                    value: player?.personaname || "Unknown"
                },
                {
                    type: 1,
                    name: "most_played",
                    value: mostPlayed?.name || "No Games"
                },
                {
                    type: 1,
                    name: "steam_level",
                    value: String(steamLevel)
                },
                {
                    type: 3,
                    name: "pfp",
                    value: {
                        url: player?.avatarfull || ""
                    }
                },
                {
                    type: 2,
                    name: "playtime",
                    value: totalPlaytimeMs
                },
                {
                    type: 2,
                    name: "owned_games",
                    value: ownedGames
                },
                {
                    type: 2,
                    name: "recent_twoweek",
                    value: recentPlaytimeMs
                },
                {
                    type: 2,
                    name: "friends",
                    value: friendCount
                },
                {
                    type: 2,
                    name: "badge_count",
                    value: badgeCount
                },
                {
                    type: 1,
                    name: "profile_age",
                    value: profileAge
                }
            ]
        }
    };

    log("Widget preview:");
    console.log(JSON.stringify(widget, null, 2));

    await updateDiscordWidget(widget);

    log("Steam widget update completed successfully.");
}

main()
    .then(() => {
        log("Finished successfully.");
        console.log("▶ All done!");
    })
    .catch(err => {
        console.error("✗ Fatal error:", err);
        process.exit(1);
    });