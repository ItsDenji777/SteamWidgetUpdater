// ============================================================================
// Steam → Discord Widget Updater
// Runs in GitHub Actions
// ============================================================================

// -------------------------------
// Environment Variables
// -------------------------------

const {
    STEAM_API_KEY,
    STEAM_ID,
    BOT_TOKEN,
    APPLICATION_ID,
    DISCORD_USER_ID
} = process.env;

// -------------------------------
// Validate Secrets
// -------------------------------

const requiredSecrets = [
    "STEAM_API_KEY",
    "STEAM_ID",
    "BOT_TOKEN",
    "APPLICATION_ID",
    "DISCORD_USER_ID"
];

for (const secret of requiredSecrets) {
    if (!process.env[secret]) {
        throw new Error(`Missing GitHub Secret: ${secret}`);
    }
}

// -------------------------------
// Logging
// -------------------------------

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

// -------------------------------
// Delay Helper
// -------------------------------

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// -------------------------------
// Fetch JSON with Retries
// -------------------------------

async function steam(url, retries = 3) {

    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {

        try {

            const res = await fetch(url);

            if (!res.ok) {

                const text = await res.text();

                throw new Error(
                    `Steam API ${res.status}\n${text}`
                );

            }

            return await res.json();

        } catch (err) {

            lastError = err;

            log(
                `Steam request failed (${attempt}/${retries})`
            );

            if (attempt !== retries) {
                await delay(1500);
            }

        }

    }

    throw lastError;

}

// -------------------------------
// Profile Age
// -------------------------------

async function getProfileAge() {

    try {

        const response = await fetch(
            `https://steamcommunity.com/profiles/${STEAM_ID}/?xml=1`
        );

        if (!response.ok) {
            return "Unknown";
        }

        const xml = await response.text();

        const match = xml.match(
            /<memberSince>(.*?)<\/memberSince>/
        );

        if (!match) {
            return "Unknown";
        }

        const created = new Date(match[1]);

        if (isNaN(created)) {
            return "Unknown";
        }

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

        return `${years} Years`;

    }

    catch {

        return "Unknown";

    }

}

// -------------------------------
// Discord Widget Updater
// -------------------------------

async function updateDiscordWidget(widget) {

    log("Updating Discord widget...");

    const response = await fetch(
        `https://placeholder.com/api/v9/applications/${APPLICATION_ID}/users/${DISCORD_USER_ID}/identities/0/profile`,
        {
            method: "PATCH",
            headers: {
                Authorization: `Bot ${BOT_TOKEN}`,
                "Content-Type": "application/json",
                "User-Agent":
                    "Bot (https://github.com/placeholder/api-docs, 1.0.0)"
            },
            body: JSON.stringify(widget)
        }
    );

    if (!response.ok) {

        const text = await response.text();

        throw new Error(
            `Discord API ${response.status}\n${text}`
        );

    }

    log("Discord widget updated.");

}

// -------------------------------
// Main
// -------------------------------

async function main() {

    log("Starting updater...");

    async function main() {

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

    log("Calculating statistics...");

    const player =
        summary.response.players?.[0];

    const games =
        owned.response.games || [];

    const recentGames =
        recent.response.games || [];

    // -------------------------------------------------
    // Lifetime playtime
    // -------------------------------------------------

    const totalMinutes =
        games.reduce(
            (sum, game) =>
                sum + (game.playtime_forever || 0),
            0
        );

    const totalPlaytimeMs =
        totalMinutes * 60000;

    // -------------------------------------------------
    // Most Played Game
    // -------------------------------------------------

    let mostPlayed = null;

    if (games.length > 0) {

        mostPlayed =
            games.reduce((highest, current) => {

                if (
                    (current.playtime_forever || 0) >
                    (highest.playtime_forever || 0)
                ) {
                    return current;
                }

                return highest;

            });

    }

    // -------------------------------------------------
    // Two Week Playtime
    // -------------------------------------------------

    const recentMinutes =
        recentGames.reduce(
            (sum, game) =>
                sum + (game.playtime_2weeks || 0),
            0
        );

    const recentPlaytimeMs =
        recentMinutes * 60000;

    // -------------------------------------------------
    // Friends
    // -------------------------------------------------

    const friendCount =
        friendsRaw.friendslist?.friends?.length || 0;

    // -------------------------------------------------
    // Badges
    // -------------------------------------------------

    const badgeCount =
        badges.response?.badges?.length || 0;

    // -------------------------------------------------
    // Owned Games
    // -------------------------------------------------

    const ownedGames =
        games.length;

    // -------------------------------------------------
    // Steam Level
    // -------------------------------------------------

    const steamLevel =
        level.response.player_level || 0;

    // -------------------------------------------------
    // Console Summary
    // -------------------------------------------------

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

}

main()
    .then(() => {
        log("Finished successfully.");
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });