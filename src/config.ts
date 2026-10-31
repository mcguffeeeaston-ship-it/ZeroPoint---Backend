import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3551", 10),
  wsPort: parseInt(process.env.WS_PORT || "80", 10),
  mongoUri: process.env.MONGODB || "mongodb://127.0.0.1:27017/zeropoint",
  jwtSecret: process.env.JWT_SECRET || "zeropoint-by-nyxa-secure-auth-secret-key-1337",
  defaultSeason: parseInt(process.env.SEASON || "9", 10),
  grantAllCosmetics: process.env.GRANT_ALL_COSMETICS !== "false",
  defaultVbucks: parseInt(process.env.DEFAULT_VBUCKS || "999999", 10),
  customLobbyBackgroundUrl: process.env.CUSTOM_LOBBY_BACKGROUND_URL || "",
  gameServer: {
    ip: process.env.GAMESERVER_IP || "127.0.0.1",
    port: parseInt(process.env.GAMESERVER_PORT || "7777", 10),
  },
};

export default config;
