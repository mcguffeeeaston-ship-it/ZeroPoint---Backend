export interface ClientBuildMetadata {
  season: number;
  build: number;
  netcl?: string;
  buildUpdate: string;
  lobby: string;
  background: string;
}

export function parseUserAgent(header: string | undefined | null): ClientBuildMetadata {
  if (!header) {
    return {
      season: 9,
      build: 9.41,
      buildUpdate: "9.41",
      lobby: "LobbySeason9",
      background: "season9",
    };
  }

  const netclMatch = header.split("-")[3]?.split(",")[0] || header.split("-")[1]?.split("+")[0];
  const buildStr = header.split("Release-")[1]?.split("-")[0] || "";
  const buildUpdate = header.split("-")[1]?.split("+")[0] || "9.41";

  let buildNum = parseFloat(buildStr) || 9.41;
  let season = Math.floor(buildNum);

  if (Number.isNaN(season) || season <= 0) {
    const fallbackMatch = header.match(/Release-(\d+\.\d+)/);
    if (fallbackMatch) {
      buildNum = parseFloat(fallbackMatch[1]);
      season = Math.floor(buildNum);
    } else {
      season = 9;
      buildNum = 9.41;
    }
  }

  let lobby = `LobbySeason${season}`;
  let background = `season${season}`;

  if (season === 0) {
    lobby = "LobbySeason0";
  } else if (season === 1) {
    lobby = "LobbySeason1";
  } else if (season === 2) {
    lobby = "LobbyWinterDecor";
  } else if (season === 6) {
    background = "fortnitemares";
  } else if (season === 10) {
    background = "seasonx";
  } else if (season >= 19) {
    lobby = "LobbySeason19";
    background = "season19";
  }

  return {
    season,
    build: buildNum,
    netcl: netclMatch,
    buildUpdate,
    lobby,
    background,
  };
}

export default parseUserAgent;
