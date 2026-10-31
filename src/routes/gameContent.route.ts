import type { Hono } from "hono";
import path from "node:path";
import parseUserAgent from "../utilites/agentParser";
import config from "../config";

export default function mountGameContentRoutes(app: Hono) {
  const pagesDiskPath = path.join(process.cwd(), "src", "memory", "content", "pages.json");

  app.get("/content/api/pages/fortnite-game", async (c) => {
    const ua = parseUserAgent(c.req.header("User-Agent"));
    let contentPayload: any = {};

    try {
      const file = Bun.file(pagesDiskPath);
      if (await file.exists()) {
        contentPayload = await file.json();
      }
    } catch {}

    const reqHost = c.req.header("host") || `127.0.0.1:${config.port}`;
    let customLobbyUrl = config.customLobbyBackgroundUrl;

    if (!customLobbyUrl) {
      const localPng = Bun.file(path.join(process.cwd(), "src", "static", "images", "lobby.png"));
      const localJpg = Bun.file(path.join(process.cwd(), "src", "static", "images", "lobby.jpg"));
      if (await localPng.exists()) {
        customLobbyUrl = `http://${reqHost}/static/images/lobby.png`;
      } else if (await localJpg.exists()) {
        customLobbyUrl = `http://${reqHost}/static/images/lobby.jpg`;
      }
    }

    const defaultBackground = "https://cdn2.unrealengine.com/Fortnite/fortnite-game/lobby/T_Lobby_SeasonX-2048x1024-24e02780ed533da8001016f4e6fb14dd15e2f860.png";
    const resolvedBackgroundUrl = customLobbyUrl || defaultBackground;
    const stageName = ua.background || "season9";

    contentPayload.lobby = {
      backgroundimage: resolvedBackgroundUrl,
      stage: stageName,
      _title: "lobby",
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
    };

    contentPayload.dynamicbackgrounds = {
      backgrounds: {
        backgrounds: [
          {
            stage: stageName,
            _type: "DynamicBackground",
            key: "vault",
            backgroundimage: resolvedBackgroundUrl,
          },
          {
            stage: stageName,
            _type: "DynamicBackground",
            key: "lobby",
            backgroundimage: resolvedBackgroundUrl,
          },
        ],
        _type: "DynamicBackgroundList",
      },
      _title: "dynamicbackgrounds",
      _noIndex: false,
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
    };

    contentPayload.tournamentinformation = {
      tournament_info: {
        tournaments: [
          {
            loading_screen_image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Solo_ModeTile-1024x512-f0ecee555f69c65e8a0eace05372371bebcb050f.jpg",
            title_color: "0BFFAC",
            background_right_color: "41108C",
            background_text_color: "390087",
            _type: "Tournament Display Info",
            tournament_display_id: "zeropoint_solo",
            highlight_color: "FFFFFF",
            primary_color: "0BFFAC",
            title_line_1: "ZEROPOINT ARENA",
            title_line_2: "SOLO COMPETITIVE",
            shadow_color: "5000BE",
            background_left_color: "B537FB",
            poster_fade_color: "420793",
            secondary_color: "FF1A40",
            playlist_tile_image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Solo_ModeTile-1024x512-f0ecee555f69c65e8a0eace05372371bebcb050f.jpg",
            base_color: "FFFFFF",
          },
          {
            loading_screen_image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Duos_ModeTile-1024x512-cbd3591ad3f947abc96302dfa987252838877dd5.jpg",
            title_color: "0BFFAC",
            background_right_color: "41108C",
            background_text_color: "390087",
            _type: "Tournament Display Info",
            tournament_display_id: "zeropoint_duos",
            highlight_color: "FFFFFF",
            primary_color: "0BFFAC",
            title_line_1: "ZEROPOINT ARENA",
            title_line_2: "DUOS COMPETITIVE",
            shadow_color: "5000BE",
            background_left_color: "B537FB",
            poster_fade_color: "420793",
            secondary_color: "FF1A40",
            playlist_tile_image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Duos_ModeTile-1024x512-cbd3591ad3f947abc96302dfa987252838877dd5.jpg",
            base_color: "FFFFFF",
          },
          {
            loading_screen_image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Solo_ModeTile-1024x512-f0ecee555f69c65e8a0eace05372371bebcb050f.jpg",
            title_color: "FFD700",
            background_right_color: "8B0000",
            background_text_color: "FFD700",
            _type: "Tournament Display Info",
            tournament_display_id: "zeropoint_cashcup",
            highlight_color: "FFFFFF",
            primary_color: "FFD700",
            title_line_1: "ZEROPOINT CASH CUP",
            title_line_2: "CHAMPION SERIES",
            shadow_color: "330000",
            background_left_color: "FF4500",
            poster_fade_color: "4A0000",
            secondary_color: "FFFF00",
            playlist_tile_image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Solo_ModeTile-1024x512-f0ecee555f69c65e8a0eace05372371bebcb050f.jpg",
            base_color: "FFFFFF",
          },
        ],
        _type: "Tournaments Info",
      },
      _title: "tournamentinformation",
      _noIndex: false,
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
    };

    contentPayload.playlistinformation = {
      frontend_matchmaking_header_style: "None",
      _title: "playlistinformation",
      frontend_matchmaking_header_text: "ZeroPoint by Nyxa • Season 9",
      playlist_info: {
        _type: "Playlist Information",
        playlists: [
          {
            image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/battleroyalenews/v9/900/09BR_PatchNotes_MOTD-1024x512-a72f0b9d99c3dfc29f649bf44beae2014bdfc919.jpg",
            playlist_name: "Playlist_DefaultSolo",
            hidden: false,
            special_border: "None",
            _type: "FortPlaylistInfo",
            display_name: "Solo",
          },
          {
            image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/battleroyalenews/v9/900/09BR_PatchNotes_MOTD-1024x512-a72f0b9d99c3dfc29f649bf44beae2014bdfc919.jpg",
            playlist_name: "Playlist_DefaultDuo",
            hidden: false,
            special_border: "None",
            _type: "FortPlaylistInfo",
            display_name: "Duos",
          },
          {
            image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/battleroyalenews/v9/900/09BR_PatchNotes_MOTD-1024x512-a72f0b9d99c3dfc29f649bf44beae2014bdfc919.jpg",
            playlist_name: "Playlist_DefaultSquad",
            hidden: false,
            special_border: "None",
            _type: "FortPlaylistInfo",
            display_name: "Squads",
          },
          {
            image: "https://static2.srcdn.com/wordpress/wp-content/uploads/2020/06/Fortnite-Creative-Mode.jpg",
            playlist_name: "Playlist_BattleLab",
            hidden: false,
            special_border: "None",
            _type: "FortPlaylistInfo",
            display_name: "Battle Lab",
          },
          {
            image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Solo_ModeTile-1024x512-f0ecee555f69c65e8a0eace05372371bebcb050f.jpg",
            playlist_name: "Playlist_ShowdownAlt_Solo",
            hidden: false,
            special_border: "Tournament",
            _type: "FortPlaylistInfo",
            display_name: "Arena Solo",
          },
          {
            image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Duos_ModeTile-1024x512-cbd3591ad3f947abc96302dfa987252838877dd5.jpg",
            playlist_name: "Playlist_ShowdownAlt_Duos",
            hidden: false,
            special_border: "Tournament",
            _type: "FortPlaylistInfo",
            display_name: "Arena Duos",
          },
          {
            image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Duos_ModeTile-1024x512-cbd3591ad3f947abc96302dfa987252838877dd5.jpg",
            playlist_name: "Playlist_ShowdownAlt_Trios",
            hidden: false,
            special_border: "Tournament",
            _type: "FortPlaylistInfo",
            display_name: "Arena Trios",
          },
          {
            image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Duos_ModeTile-1024x512-cbd3591ad3f947abc96302dfa987252838877dd5.jpg",
            playlist_name: "Playlist_ShowdownAlt_Squad",
            hidden: false,
            special_border: "Tournament",
            _type: "FortPlaylistInfo",
            display_name: "Arena Squads",
          },
          {
            image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/tournaments/12BR_Arena_Solo_ModeTile-1024x512-f0ecee555f69c65e8a0eace05372371bebcb050f.jpg",
            playlist_name: "Playlist_Showdown_Tournament_Solo",
            hidden: false,
            special_border: "Tournament",
            _type: "FortPlaylistInfo",
            display_name: "Cash Cup Solo",
          },
        ],
      },
      _noIndex: false,
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
    };

    contentPayload.battleroyalenews = {
      news: {
        _type: "Battle Royale News",
        messages: [
          {
            image: "https://cdn2.unrealengine.com/Fortnite/fortnite-game/battleroyalenews/v9/900/09BR_PatchNotes_MOTD-1024x512-a72f0b9d99c3dfc29f649bf44beae2014bdfc919.jpg",
            hidden: false,
            _type: "CommonUI Simple Message Base",
            title: "ZeroPoint by Nyxa",
            body: "Welcome to ZeroPoint by Nyxa! The premier open-source Fortnite experience. Fully equipped with custom item shop, lobby backgrounds, tournaments, and competitive Arena playlists!",
            spotlight: true,
          },
          {
            image: "https://cdn2.unrealengine.com/12br-patchnotes-news-motd-1024x512-1024x512-701389279.jpg",
            hidden: false,
            _type: "CommonUI Simple Message Base",
            title: "ZeroPoint Arena & Tournaments",
            body: "Compete in Arena Solos, Duos, Trios, and Cash Cups. Climb through Open, Contender, and Champion divisions to earn your Hype!",
            spotlight: false,
          },
        ],
      },
      _title: "battleroyalenews",
      _noIndex: false,
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
    };

    contentPayload.emergencynotice = {
      news: {
        _type: "Emergency Notice",
        messages: [
          {
            hidden: false,
            _type: "CommonUI Simple Message Base",
            title: "ZeroPoint by Nyxa",
            body: "ZeroPoint by Nyxa backend services and matchmaking are online and optimal.",
          },
        ],
      },
      _title: "emergencynotice",
      _noIndex: false,
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
    };

    contentPayload.loginmessage = {
      loginmessage: {
        _type: "CommonUI Simple Message",
        message: {
          _type: "CommonUI Simple Message Base",
          title: "ZeroPoint by Nyxa",
          body: "ZeroPoint by Nyxa - Custom item shop, custom lobby background, tournaments, and Arena support enabled.",
        },
      },
      _title: "loginmessage",
      _noIndex: false,
      _activeDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      _locale: "en-US",
    };

    return c.json(contentPayload);
  });
}
