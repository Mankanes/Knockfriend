// ============================================================
// KNOCKFRIEND - Backend
// Vse v jednom souboru: konstanty, herni simulace, server, sockets
// ============================================================

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

// ============================================================
// KONSTANTY (driv shared.js)
// ============================================================

const SHARED = {
  TICK_RATE: 60,                // server simulation Hz (60 pro plynuly movement)
  WORLD_WIDTH: 1600,
  WORLD_HEIGHT: 900,
  GRAVITY: 1800,
  MAX_FALL_SPEED: 1400,

  PLAYER: {
    WIDTH: 36,
    HEIGHT: 56,
    MOVE_SPEED: 380,
    ACCEL_GROUND: 4500,
    ACCEL_AIR: 2200,
    FRICTION_GROUND: 3500,
    JUMP_VELOCITY: 850,
    DOUBLE_JUMP_VELOCITY: 780,
    MAX_JUMPS: 2,
    MAX_HEALTH: 100,
    RESPAWN_DELAY: 1.2,
    KNOCKBACK_DAMP: 4.0,
    DEATH_Y: 1100,
  },

  ROUND: {
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 8,
    PRE_ROUND: 3.0,
    POST_ROUND: 4.0,
    POST_MATCH: 6.0, // doba zobrazeni "X WINS THE MATCH" pred navratem do lobby
    MATCH_WIN_SCORE: 3,
  },

  WEAPONS: {
    pistol: {
      name: "Pistol", damage: 12, fireRate: 0.18,
      bulletSpeed: 1200, bulletGravity: 0.15, spread: 0.02,
      pelletsPerShot: 1, recoil: 90, knockback: 220,
      bulletLife: 1.5, bulletRadius: 4, ammo: Infinity, color: "#ffe66d",
    },
    shotgun: {
      name: "Shotgun", damage: 8, fireRate: 0.55,
      bulletSpeed: 1050, bulletGravity: 0.35, spread: 0.22,
      pelletsPerShot: 6, recoil: 380, knockback: 180,
      bulletLife: 0.55, bulletRadius: 4, ammo: 18, color: "#ff9f43",
    },
    rocket: {
      name: "Rocket Launcher", damage: 45, splashDamage: 35, splashRadius: 160,
      fireRate: 0.95, bulletSpeed: 700, bulletGravity: 0.10, spread: 0.0,
      pelletsPerShot: 1, recoil: 520, knockback: 1400,
      bulletLife: 3.0, bulletRadius: 8, ammo: 5, color: "#ff5252", isRocket: true,
    },
    laser: {
      name: "Laser Rifle", damage: 22, fireRate: 0.10,
      bulletSpeed: 2400, bulletGravity: 0.0, spread: 0.0,
      pelletsPerShot: 1, recoil: 40, knockback: 90,
      bulletLife: 0.8, bulletRadius: 3, ammo: 30, color: "#54e0ff", isLaser: true,
    },
    awp: {
      name: "AWP Sniper", damage: 95, fireRate: 1.6,
      bulletSpeed: 3500, bulletGravity: 0.0, spread: 0.0,
      pelletsPerShot: 1, recoil: 800, knockback: 950,
      bulletLife: 1.5, bulletRadius: 3, ammo: 3, color: "#9b59b6", isAwp: true,
    },
    grenade: {
      name: "HE Grenade", damage: 0, splashDamage: 60, splashRadius: 180,
      fireRate: 0.85, bulletSpeed: 700, bulletGravity: 0.95, spread: 0.0,
      pelletsPerShot: 1, recoil: 200, knockback: 1100,
      bulletLife: 2.5, bulletRadius: 6, ammo: 3, color: "#3b8c3b", isGrenade: true,
      fuseTime: 1.6, // sekundy do vybuchu
    },
    punch: {
      name: "Super Punch", damage: 28, fireRate: 0.45,
      bulletSpeed: 1400, bulletGravity: 0.0, spread: 0.0,
      pelletsPerShot: 1, recoil: 80, knockback: 2400, // MEGA knockback
      bulletLife: 0.06, bulletRadius: 22, ammo: Infinity, color: "#ffe66d", isPunch: true,
    },
  },

  PICKUP: {
    SPAWN_INTERVAL: 8.0,
    MAX_ON_MAP: 3,
    FALL_GRAVITY: 600,
    WIDTH: 28,
    HEIGHT: 28,
  },

  COLORS: [
    "#ff5e5e", "#5ec8ff", "#7dff7d", "#ffd75e",
    "#c87dff", "#ff7dc8", "#7dffd0", "#ffa07d",
  ],

  MAPS: {
    skybridge: {
      name: "Skybridge", bg: "#1a2840", bgAccent: "#2a3a5a",
      platforms: [
        { x: 100, y: 720, w: 520, h: 40 },
        { x: 980, y: 720, w: 520, h: 40 },
        { x: 380, y: 540, w: 220, h: 24 },
        { x: 1000, y: 540, w: 220, h: 24 },
        { x: 690, y: 460, w: 220, h: 24, destructible: true, hp: 80 },
        { x: 220, y: 340, w: 180, h: 22 },
        { x: 1200, y: 340, w: 180, h: 22 },
        { x: 690, y: 240, w: 220, h: 22 },
      ],
      spawns: [
        { x: 200, y: 660 }, { x: 1380, y: 660 }, { x: 480, y: 480 },
        { x: 1100, y: 480 }, { x: 320, y: 280 }, { x: 1280, y: 280 },
        { x: 800, y: 180 }, { x: 770, y: 400 },
      ],
    },
    pillars: {
      name: "Pillars", bg: "#2a1a40", bgAccent: "#3a2a5a",
      platforms: [
        { x: 60, y: 760, w: 1480, h: 40 },
        { x: 280, y: 540, w: 80, h: 220 },
        { x: 640, y: 540, w: 80, h: 220, destructible: true, hp: 100 },
        { x: 880, y: 540, w: 80, h: 220, destructible: true, hp: 100 },
        { x: 1240, y: 540, w: 80, h: 220 },
        { x: 120, y: 420, w: 220, h: 22 },
        { x: 1240, y: 420, w: 220, h: 22 },
        { x: 580, y: 360, w: 220, h: 22 },
        { x: 800, y: 360, w: 220, h: 22 },
        { x: 380, y: 220, w: 200, h: 22 },
        { x: 1020, y: 220, w: 200, h: 22 },
        { x: 690, y: 140, w: 220, h: 22 },
      ],
      spawns: [
        { x: 200, y: 700 }, { x: 1400, y: 700 }, { x: 800, y: 700 },
        { x: 480, y: 300 }, { x: 1120, y: 300 }, { x: 230, y: 360 },
        { x: 1350, y: 360 }, { x: 800, y: 80 },
      ],
    },
    chasm: {
      name: "Chasm", bg: "#401a25", bgAccent: "#5a2a3a",
      platforms: [
        { x: 40, y: 700, w: 420, h: 36 },
        { x: 1140, y: 700, w: 420, h: 36 },
        { x: 540, y: 620, w: 120, h: 22 },
        { x: 940, y: 620, w: 120, h: 22 },
        { x: 740, y: 540, w: 120, h: 22, destructible: true, hp: 60 },
        { x: 200, y: 480, w: 240, h: 22 },
        { x: 1160, y: 480, w: 240, h: 22 },
        { x: 540, y: 360, w: 220, h: 22 },
        { x: 840, y: 360, w: 220, h: 22 },
        { x: 690, y: 220, w: 220, h: 22 },
      ],
      spawns: [
        { x: 150, y: 640 }, { x: 1450, y: 640 }, { x: 320, y: 420 },
        { x: 1280, y: 420 }, { x: 650, y: 300 }, { x: 950, y: 300 },
        { x: 800, y: 160 }, { x: 600, y: 580 },
      ],
    },
    // INDUSTRIAL - tovarna s kontejnery
    industrial: {
      name: "Industrial", bg: "#2a2a2a", bgAccent: "#4a4030",
      platforms: [
        // Spodni rad
        { x: 60, y: 740, w: 380, h: 40 },
        { x: 1160, y: 740, w: 380, h: 40 },
        // Stredni "kontejnery"
        { x: 540, y: 660, w: 180, h: 120 },
        { x: 880, y: 660, w: 180, h: 120 },
        // Most uprostred
        { x: 720, y: 540, w: 160, h: 22, destructible: true, hp: 80 },
        // Bocni patro
        { x: 100, y: 480, w: 280, h: 22 },
        { x: 1220, y: 480, w: 280, h: 22 },
        // Stredni vyssi platformy
        { x: 480, y: 380, w: 200, h: 22 },
        { x: 920, y: 380, w: 200, h: 22 },
        // Horni
        { x: 220, y: 280, w: 200, h: 22 },
        { x: 1180, y: 280, w: 200, h: 22 },
        { x: 690, y: 200, w: 220, h: 22 },
      ],
      spawns: [
        { x: 150, y: 680 }, { x: 1400, y: 680 }, { x: 600, y: 600 },
        { x: 970, y: 600 }, { x: 200, y: 420 }, { x: 1320, y: 420 },
        { x: 800, y: 140 }, { x: 560, y: 320 },
      ],
    },
    // ROOFTOPS - velke gap jumpy, mensi platformy
    rooftops: {
      name: "Rooftops", bg: "#1a1a30", bgAccent: "#2e2a4a",
      platforms: [
        // 3 hlavni strechy (vlevo, stred, vpravo)
        { x: 60, y: 600, w: 360, h: 200 },
        { x: 620, y: 540, w: 360, h: 260 },
        { x: 1180, y: 600, w: 360, h: 200 },
        // Mensi platformy mezi nimi (gap jumps)
        { x: 460, y: 460, w: 120, h: 22 },
        { x: 1020, y: 460, w: 120, h: 22 },
        // Horni patra
        { x: 260, y: 360, w: 180, h: 22, destructible: true, hp: 70 },
        { x: 1160, y: 360, w: 180, h: 22, destructible: true, hp: 70 },
        { x: 690, y: 320, w: 220, h: 22 },
        // Nejvyssi
        { x: 480, y: 200, w: 200, h: 22 },
        { x: 920, y: 200, w: 200, h: 22 },
      ],
      spawns: [
        { x: 200, y: 540 }, { x: 800, y: 480 }, { x: 1380, y: 540 },
        { x: 350, y: 300 }, { x: 1250, y: 300 }, { x: 580, y: 140 },
        { x: 1020, y: 140 }, { x: 800, y: 260 },
      ],
    },
    // CAVES - tesne prostory, nizke platformy
    caves: {
      name: "Caves", bg: "#180f12", bgAccent: "#3a2418",
      platforms: [
        // Spodni patro
        { x: 0, y: 720, w: 500, h: 40 },
        { x: 600, y: 720, w: 400, h: 40 },
        { x: 1100, y: 720, w: 500, h: 40 },
        // Stredni patro (uzke)
        { x: 200, y: 560, w: 240, h: 22 },
        { x: 580, y: 560, w: 440, h: 22 },
        { x: 1160, y: 560, w: 240, h: 22 },
        // Horni patro (rozdrobene)
        { x: 80, y: 400, w: 180, h: 22 },
        { x: 380, y: 400, w: 180, h: 22, destructible: true, hp: 60 },
        { x: 680, y: 400, w: 240, h: 22 },
        { x: 1040, y: 400, w: 180, h: 22, destructible: true, hp: 60 },
        { x: 1340, y: 400, w: 180, h: 22 },
        // Pres strop (visici)
        { x: 480, y: 220, w: 200, h: 22 },
        { x: 920, y: 220, w: 200, h: 22 },
        { x: 690, y: 130, w: 220, h: 22 },
      ],
      spawns: [
        { x: 200, y: 660 }, { x: 800, y: 660 }, { x: 1380, y: 660 },
        { x: 320, y: 500 }, { x: 1280, y: 500 }, { x: 800, y: 500 },
        { x: 580, y: 160 }, { x: 1000, y: 160 },
      ],
    },
    // ARENA - uzavrena bezvoid arena, symetricka (idealni pro TDM/CTF)
    arena: {
      name: "Arena", bg: "#1a1018", bgAccent: "#3a2030",
      platforms: [
        // Spodni floor (cely - bez void!)
        { x: 0, y: 800, w: 1600, h: 100 },
        // Leve a prave steny (uzavreny prostor)
        { x: 0, y: 0, w: 30, h: 900 },
        { x: 1570, y: 0, w: 30, h: 900 },
        // Symetricke platformy
        { x: 200, y: 660, w: 200, h: 22 },
        { x: 1200, y: 660, w: 200, h: 22 },
        { x: 500, y: 560, w: 200, h: 22 },
        { x: 900, y: 560, w: 200, h: 22 },
        // Stred (capture point feel)
        { x: 700, y: 460, w: 200, h: 22 },
        // Vyssi platformy
        { x: 250, y: 380, w: 180, h: 22, destructible: true, hp: 70 },
        { x: 1170, y: 380, w: 180, h: 22, destructible: true, hp: 70 },
        { x: 600, y: 300, w: 100, h: 22 },
        { x: 900, y: 300, w: 100, h: 22 },
        // Vrcholova platforma
        { x: 690, y: 180, w: 220, h: 22 },
      ],
      spawns: [
        { x: 100, y: 740 }, { x: 1450, y: 740 },
        { x: 280, y: 600 }, { x: 1280, y: 600 },
        { x: 580, y: 500 }, { x: 980, y: 500 },
        { x: 750, y: 400 }, { x: 800, y: 120 },
      ],
    },
    // BOWL - misovita mapa s ramenem nahoru, bez void
    bowl: {
      name: "Bowl", bg: "#0d1a26", bgAccent: "#1e3349",
      platforms: [
        // Spodni misa (siroka, nelze spadnout)
        { x: 0, y: 800, w: 1600, h: 100 },
        // Sikme stranky misy (vlastne stupne)
        { x: 0, y: 720, w: 200, h: 80 },
        { x: 1400, y: 720, w: 200, h: 80 },
        { x: 100, y: 640, w: 150, h: 80 },
        { x: 1350, y: 640, w: 150, h: 80 },
        // Strední platformy
        { x: 350, y: 580, w: 200, h: 22 },
        { x: 1050, y: 580, w: 200, h: 22 },
        { x: 700, y: 540, w: 200, h: 22, destructible: true, hp: 80 },
        // Bocni vyssi
        { x: 250, y: 420, w: 180, h: 22 },
        { x: 1170, y: 420, w: 180, h: 22 },
        // Vrch
        { x: 550, y: 320, w: 150, h: 22 },
        { x: 900, y: 320, w: 150, h: 22 },
        { x: 720, y: 180, w: 160, h: 22 },
      ],
      spawns: [
        { x: 100, y: 660 }, { x: 1450, y: 660 },
        { x: 420, y: 520 }, { x: 1120, y: 520 },
        { x: 770, y: 480 }, { x: 320, y: 360 },
        { x: 1240, y: 360 }, { x: 790, y: 120 },
      ],
    },
    // FORTRESS - velka aréna se steny a uvnitr vez (ideal pro CTF)
    fortress: {
      name: "Fortress", bg: "#1a1a0d", bgAccent: "#3a3a1e",
      platforms: [
        // Spodni floor
        { x: 0, y: 800, w: 1600, h: 100 },
        // Leve a prave bocnice (steny)
        { x: 0, y: 500, w: 60, h: 300 },
        { x: 1540, y: 500, w: 60, h: 300 },
        // Hradby - leva strana (red base)
        { x: 100, y: 680, w: 220, h: 22 },
        { x: 60, y: 580, w: 180, h: 22 },
        { x: 280, y: 580, w: 80, h: 22 },
        // Hradby - prava strana (blue base)
        { x: 1280, y: 680, w: 220, h: 22 },
        { x: 1360, y: 580, w: 180, h: 22 },
        { x: 1240, y: 580, w: 80, h: 22 },
        // Stredni vez/most
        { x: 500, y: 680, w: 250, h: 22 },
        { x: 850, y: 680, w: 250, h: 22 },
        { x: 600, y: 540, w: 400, h: 22, destructible: true, hp: 100 },
        // Horni patro
        { x: 380, y: 380, w: 180, h: 22 },
        { x: 1040, y: 380, w: 180, h: 22 },
        { x: 700, y: 320, w: 200, h: 22 },
        // Vrcholova
        { x: 740, y: 160, w: 120, h: 22 },
      ],
      spawns: [
        // Vlevo (red strana)
        { x: 120, y: 620 }, { x: 250, y: 740 }, { x: 100, y: 520 },
        // Vpravo (blue strana)
        { x: 1430, y: 620 }, { x: 1330, y: 740 }, { x: 1450, y: 520 },
        // Stred
        { x: 600, y: 480 }, { x: 950, y: 480 },
      ],
    },
  },
};

// ============================================================
// HERNI TRIDA (driv game.js)
// ============================================================

let nextEntityId = 1;
const newId = () => "e" + (nextEntityId++);

function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

class Game {
  constructor(roomId, mapKey = "skybridge") {
    this.roomId = roomId;
    this.mapKey = mapKey;
    this.map = SHARED.MAPS[mapKey];
    this.players = new Map();
    this.bullets = [];
    this.pickups = [];
    this.events = [];
    this.platforms = [];
    this.phase = "lobby";
    this.phaseTimer = 0;
    this.roundNumber = 0;
    this.lastWinner = null;
    this.matchWinner = null;
    this.pickupSpawnTimer = SHARED.PICKUP.SPAWN_INTERVAL;
    this.tickCount = 0;
    // Host = prvni hrac, ten muze menit nastaveni
    this.hostId = null;
    // Nastaveni matche - host muze v lobby zmenit
    this.matchSettings = {
      winScore: SHARED.ROUND.MATCH_WIN_SCORE, // pocet vyhranych kol pro vyhru matche
      phoneOnly: false, // pokud true, jen mobilni hraci se mohou pripojit
      isPublic: true,   // pokud true, lobby je viditelna v open rooms listu
      gameMode: "ffa",  // ffa | tdm | ctf | gungame
    };
    // Game mode state
    this.teamScores = { red: 0, blue: 0 }; // pro TDM/CTF
    this.flags = { red: null, blue: null }; // pro CTF - { x, y, holderId, atBase }
    this.gunGameProgress = new Map(); // playerId -> indexInChain
  }

  // Pro GunGame: poradi zbrani od slabe k silne
  static GUN_GAME_CHAIN = ["pistol", "shotgun", "laser", "rocket", "awp", "grenade", "punch"];

  loadMap(mapKey) {
    if (!SHARED.MAPS[mapKey]) return;
    this.mapKey = mapKey;
    this.map = SHARED.MAPS[mapKey];
    this.platforms = this.map.platforms.map((p) => ({
      ...p, hp: p.hp || 0, destroyed: false,
    }));
  }

  addPlayer(socketId, name, isBot = false) {
    if (this.players.size >= SHARED.ROUND.MAX_PLAYERS) return null;
    // Najdi prvni nepouzitou barvu
    const usedColors = new Set();
    for (const p of this.players.values()) usedColors.add(p.color);
    let color = SHARED.COLORS.find((c) => !usedColors.has(c)) || SHARED.COLORS[0];
    const player = {
      id: socketId,
      name: (name || "Player").slice(0, 16),
      color,
      x: 200, y: 200, vx: 0, vy: 0,
      facing: 1, onGround: false,
      jumpsLeft: SHARED.PLAYER.MAX_JUMPS,
      hp: SHARED.PLAYER.MAX_HEALTH,
      alive: false, respawnAt: 0,
      weapon: "pistol", ammo: Infinity, lastShotAt: -10,
      knockbackVx: 0, knockbackVy: 0,
      input: { left: false, right: false, jump: false, shoot: false, aimX: 0, aimY: 0, switch: null },
      lastJumpInput: false,
      score: 0, kills: 0, deaths: 0,
      ready: !!isBot, // boti jsou vzdy ready
      isBot,
      isAdmin: false,
      isTester: false,
      ping: 0,
      botMove: false, // jestli se bot ma hybat
      shotCountWindow: [],
      team: null, // "red" nebo "blue" pro TDM/CTF, null pro FFA/gungame
      hasFlag: null, // "red"/"blue" pokud nese vlajku (CTF)
    };
    this.players.set(socketId, player);
    // Pokud jsme jeste neměli hosta a tohle je realny hrac, je host
    if (!this.hostId && !isBot) {
      this.hostId = socketId;
    }
    return player;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    // Pokud odesel host, najdi noveho (prvniho realnyho hrace)
    if (this.hostId === socketId) {
      this.hostId = null;
      for (const [id, p] of this.players) {
        if (!p.isBot) {
          this.hostId = id;
          break;
        }
      }
    }
  }

  // Hrac si vybere barvu - jen v lobby, jen pokud neni jiz pouzita
  setColor(socketId, color) {
    if (this.phase !== "lobby") return false;
    if (!SHARED.COLORS.includes(color)) return false;
    const p = this.players.get(socketId);
    if (!p) return false;
    // Zkontroluj jestli barva neni pouzita jinym hracem
    for (const other of this.players.values()) {
      if (other.id !== socketId && other.color === color) {
        return false; // barva pouzita
      }
    }
    p.color = color;
    return true;
  }

  // Host muze zmenit nastaveni matche - jen v lobby
  setMatchSettings(socketId, settings) {
    if (this.hostId !== socketId) return false;
    if (this.phase !== "lobby") return false;
    if (settings && typeof settings.winScore === "number") {
      // Povolene hodnoty: 1 az 10 winu
      const ws = Math.max(1, Math.min(10, Math.round(settings.winScore)));
      this.matchSettings.winScore = ws;
    }
    if (settings && typeof settings.phoneOnly === "boolean") {
      this.matchSettings.phoneOnly = settings.phoneOnly;
    }
    if (settings && typeof settings.isPublic === "boolean") {
      this.matchSettings.isPublic = settings.isPublic;
    }
    if (settings && typeof settings.gameMode === "string") {
      const allowed = ["ffa", "tdm", "ctf", "gungame"];
      if (allowed.includes(settings.gameMode)) {
        this.matchSettings.gameMode = settings.gameMode;
      }
    }
    return true;
  }

  setReady(socketId, ready) {
    const p = this.players.get(socketId);
    if (p) p.ready = !!ready;
  }

  setInput(socketId, input) {
    const p = this.players.get(socketId);
    if (!p) return;
    p.input = {
      left: !!input.left,
      right: !!input.right,
      jump: !!input.jump,
      shoot: !!input.shoot,
      aimX: clamp(Number(input.aimX) || 0, -2, 2),
      aimY: clamp(Number(input.aimY) || 0, -2, 2),
      switch: input.switch && SHARED.WEAPONS[input.switch] ? input.switch : null,
    };
  }

  tryStartMatch() {
    const ready = [...this.players.values()].filter((p) => p.ready);
    if (
      this.phase === "lobby" &&
      this.players.size >= SHARED.ROUND.MIN_PLAYERS &&
      ready.length === this.players.size
    ) {
      this.startMatch();
    }
  }

  startMatch() {
    for (const p of this.players.values()) {
      p.score = 0; p.kills = 0; p.deaths = 0;
    }
    this.matchWinner = null;
    this.roundNumber = 0;
    this.startRound();
  }

  startRound() {
    this.roundNumber++;
    this.bullets = [];
    this.pickups = [];
    this.pickupSpawnTimer = SHARED.PICKUP.SPAWN_INTERVAL * 0.5;
    this.events.push({ type: "round_start", round: this.roundNumber });
    this.loadMap(this.mapKey);

    const mode = this.matchSettings.gameMode;

    // Team assignment pro TDM a CTF
    if (mode === "tdm" || mode === "ctf") {
      this.assignTeams();
    } else {
      // FFA/gungame - vsichni bez teamu
      for (const p of this.players.values()) p.team = null;
    }

    // CTF - inicializuj vlajky na obou stranach mapy
    if (mode === "ctf") {
      const map = this.map;
      // Najdi nejlevejsi a nejpravejsi spawn jako pozice pro vlajky
      let leftMost = map.spawns[0];
      let rightMost = map.spawns[0];
      for (const s of map.spawns) {
        if (s.x < leftMost.x) leftMost = s;
        if (s.x > rightMost.x) rightMost = s;
      }
      this.flags.red = { x: leftMost.x, y: leftMost.y - 40, baseX: leftMost.x, baseY: leftMost.y - 40, holderId: null, atBase: true };
      this.flags.blue = { x: rightMost.x, y: rightMost.y - 40, baseX: rightMost.x, baseY: rightMost.y - 40, holderId: null, atBase: true };
    } else {
      this.flags.red = null;
      this.flags.blue = null;
    }

    // GunGame - reset progress na pistol pro vsechny
    if (mode === "gungame") {
      for (const p of this.players.values()) {
        this.gunGameProgress.set(p.id, 0); // pistol
      }
    }

    // Nahodne preusporadame spawny (Fisher-Yates shuffle)
    const spawns = this.map.spawns.slice();
    for (let j = spawns.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [spawns[j], spawns[k]] = [spawns[k], spawns[j]];
    }

    // V TDM/CTF - red tym dostane leve spawny, blue prave
    let redSpawns = [], blueSpawns = [], allSpawns = spawns;
    if (mode === "tdm" || mode === "ctf") {
      const midX = SHARED.WORLD_WIDTH / 2;
      redSpawns = spawns.filter(s => s.x < midX);
      blueSpawns = spawns.filter(s => s.x >= midX);
      if (redSpawns.length === 0) redSpawns = spawns.slice(0, Math.ceil(spawns.length / 2));
      if (blueSpawns.length === 0) blueSpawns = spawns.slice(Math.ceil(spawns.length / 2));
    }

    // Pridelime spawny tak aby nikdo nebyl blizko jineho hrace
    const MIN_DIST = 250; // minimalni vzdalenost mezi hraci
    const usedSpawns = []; // pole pridelenych pozic

    for (const p of this.players.values()) {
      // V TDM/CTF si vyber spawn podle teamu
      let pool = allSpawns;
      if ((mode === "tdm" || mode === "ctf") && p.team === "red") pool = redSpawns;
      if ((mode === "tdm" || mode === "ctf") && p.team === "blue") pool = blueSpawns;

      // Najdi nejlepsi spawn - ten ktery je nejdal od vsech jiz pridelenych
      let bestSpawn = null;
      let bestMinDist = -1;
      for (const s of pool) {
        // Spocitej nejmensi vzdalenost od jiz pouzitych spawnu
        let minDist = Infinity;
        for (const u of usedSpawns) {
          const d = Math.hypot(s.x - u.x, s.y - u.y);
          if (d < minDist) minDist = d;
        }
        if (usedSpawns.length === 0) minDist = Infinity;
        // Pokud najdeme spawn s minimalni vzdalenosti vetsi nez bestMinDist, vezmeme
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestSpawn = s;
        }
      }
      // Pokud zadne misto neni dost daleko, vezmeme jakekoli (random)
      if (!bestSpawn || (bestMinDist < MIN_DIST && usedSpawns.length < pool.length)) {
        // Najdi prvni spawn ktery jeste nebyl pouzity
        for (const s of pool) {
          if (!usedSpawns.includes(s)) {
            bestSpawn = s;
            break;
          }
        }
        if (!bestSpawn) bestSpawn = pool[0] || spawns[0]; // fallback
      }

      usedSpawns.push(bestSpawn);
      p.x = bestSpawn.x; p.y = bestSpawn.y;
      p.vx = 0; p.vy = 0;
      p.knockbackVx = 0; p.knockbackVy = 0;
      p.hp = SHARED.PLAYER.MAX_HEALTH;
      p.alive = true;
      p.hasFlag = null;
      // GunGame - kazdy zacina pistolkou
      if (mode === "gungame") {
        p.weapon = "pistol";
        p.ammo = Infinity;
      } else {
        p.weapon = "pistol";
        p.ammo = Infinity;
      }
      p.jumpsLeft = SHARED.PLAYER.MAX_JUMPS;
      p.respawnAt = 0;
    }

    this.phase = "preround";
    this.phaseTimer = SHARED.ROUND.PRE_ROUND;
  }

  // Rozdeli hrace do tymu (vyvazene)
  assignTeams() {
    const players = Array.from(this.players.values());
    // Shuffle pro nahodne rozdeleni
    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }
    for (let i = 0; i < players.length; i++) {
      players[i].team = i % 2 === 0 ? "red" : "blue";
    }
  }

  endRound(winnerId) {
    this.lastWinner = winnerId;
    if (winnerId) {
      const w = this.players.get(winnerId);
      if (w) w.score++;
    }
    this.events.push({ type: "round_end", winnerId });

    let matchWinner = null;
    for (const p of this.players.values()) {
      if (p.score >= this.matchSettings.winScore) {
        matchWinner = p.id;
        break;
      }
    }
    if (matchWinner) {
      this.matchWinner = matchWinner;
      this.phase = "matchover";
      this.phaseTimer = 8.0;
      // Tracking statistik - gamesPlayed pro vsechny, wins pro vyherce, playTime
      const now = Date.now();
      for (const p of this.players.values()) {
        if (p.isBot || !p.username) continue;
        if (!users[p.username]) continue;
        if (!users[p.username].stats) users[p.username].stats = { gamesPlayed: 0, kills: 0, deaths: 0, wins: 0, playTimeMs: 0, xp: 0 };
        users[p.username].stats.gamesPlayed++;
        // XP za odehrany match
        let xpEarned = XP_REWARDS.matchPlayed;
        let reason = "Match played";
        if (p.id === matchWinner) {
          users[p.username].stats.wins++;
          xpEarned += XP_REWARDS.win;
          reason = "Match won!";
        }
        users[p.username].stats.xp = (users[p.username].stats.xp || 0) + xpEarned;
        if (p.matchStartTime) {
          users[p.username].stats.playTimeMs += (now - p.matchStartTime);
          p.matchStartTime = now; // reset pro dalsi match
        }
        saveUser(p.username);
        emitToUser(p.username, "xp_gained", { amount: xpEarned, reason, totalXP: users[p.username].stats.xp });
      }
    } else {
      this.phase = "postround";
      this.phaseTimer = SHARED.ROUND.POST_ROUND;
    }
  }

  returnToLobby() {
    this.phase = "lobby";
    this.phaseTimer = 0;
    this.bullets = [];
    this.pickups = [];
    this.matchWinner = null;
    for (const p of this.players.values()) {
      p.ready = false; p.alive = false; p.score = 0;
    }
  }

  update(dt) {
    this.tickCount++;
    this.events = [];

    if (this.phase === "lobby") return;

    if (this.phase === "preround") {
      this.phaseTimer -= dt;
      this.simulatePlayers(dt, false);
      this.simulateBullets(dt);
      if (this.phaseTimer <= 0) {
        this.phase = "playing";
        this.phaseTimer = 0;
      }
      return;
    }

    if (this.phase === "playing") {
      this.simulatePlayers(dt, true);
      this.simulateBullets(dt);
      this.simulatePickups(dt);
      // CTF - aktualizace vlajek (pickup, capture, auto-return)
      if (this.matchSettings.gameMode === "ctf") {
        this.simulateCTF(dt);
      }
      this.checkWinCondition();
      return;
    }

    if (this.phase === "postround" || this.phase === "matchover") {
      this.phaseTimer -= dt;
      this.simulatePlayers(dt, false);
      this.simulateBullets(dt);
      if (this.phaseTimer <= 0) {
        if (this.phase === "matchover") {
          this.returnToLobby();
        } else {
          this.startRound();
        }
      }
    }
  }

  simulatePlayers(dt, allowShoot) {
    // Bot AI: jednoducha logika - bud stoji, nebo se pohybuje nahodne
    for (const p of this.players.values()) {
      if (!p.isBot || !p.alive) continue;
      if (!p.botMove) {
        // Stoji - vsechny inputy false
        p.input.left = false;
        p.input.right = false;
        p.input.jump = false;
        p.input.shoot = false;
        continue;
      }
      // Nahodny wandering
      if (!p._botTimer || p._botTimer <= 0) {
        p._botDir = Math.random() < 0.33 ? -1 : Math.random() < 0.5 ? 0 : 1;
        p._botJump = Math.random() < 0.3;
        p._botTimer = 0.5 + Math.random() * 1.5;
      }
      p._botTimer -= dt;
      p.input.left = p._botDir === -1;
      p.input.right = p._botDir === 1;
      p.input.jump = p._botJump && Math.random() < 0.05;
      p.input.shoot = false;
    }

    for (const p of this.players.values()) {
      if (!p.alive) {
        if (this.phase === "playing" && p.respawnAt > 0) {
          p.respawnAt -= dt;
          if (p.respawnAt <= 0) {
            // V TDM/CTF/GunGame - respawn na vlastni strane mapy
            const mode = this.matchSettings.gameMode;
            if (mode === "tdm" || mode === "ctf" || mode === "gungame") {
              this.respawnPlayer(p);
            } else {
              p.respawnAt = 0;
            }
          }
        }
        continue;
      }

      const PL = SHARED.PLAYER;

      // Knockback decay
      const damp = Math.exp(-PL.KNOCKBACK_DAMP * dt);
      p.knockbackVx *= damp;
      p.knockbackVy *= damp;

      // Lock pohyb v preround / postround / matchover (countdown faze)
      // Hraci nemohou ovladat pohyb dokud countdown nedoběhne
      const movementLocked = this.phase !== "playing";

      const inp = p.input;
      const wantLeft = !movementLocked && inp.left && !inp.right;
      const wantRight = !movementLocked && inp.right && !inp.left;
      const targetVx = wantLeft ? -PL.MOVE_SPEED : wantRight ? PL.MOVE_SPEED : 0;
      const accel = p.onGround ? PL.ACCEL_GROUND : PL.ACCEL_AIR;

      if (movementLocked) {
        // Behem countdownu nech hrace stat na miste - okamzite zastavit
        if (p.onGround) {
          p.vx = 0;
        }
      } else if (targetVx !== 0) {
        const diff = targetVx - p.vx;
        const step = Math.sign(diff) * accel * dt;
        if (Math.abs(step) > Math.abs(diff)) p.vx = targetVx;
        else p.vx += step;
        p.facing = wantLeft ? -1 : 1;
      } else if (p.onGround) {
        // INSTANT STOP - kdyz se nestiska zadna klavesa a hrac je na zemi, ihned se zastav
        // (zadne klouzani po zastaveni)
        p.vx = 0;
      }

      if (!movementLocked && inp.jump && !p.lastJumpInput && p.jumpsLeft > 0) {
        if (p.onGround || p.jumpsLeft === PL.MAX_JUMPS) {
          p.vy = -PL.JUMP_VELOCITY;
        } else {
          p.vy = -PL.DOUBLE_JUMP_VELOCITY;
        }
        p.jumpsLeft--;
        p.onGround = false;
      }
      p.lastJumpInput = inp.jump;

      p.vy += SHARED.GRAVITY * dt;
      if (p.vy > SHARED.MAX_FALL_SPEED) p.vy = SHARED.MAX_FALL_SPEED;

      const totalVx = p.vx + p.knockbackVx;
      const totalVy = p.vy + p.knockbackVy;

      this.moveAndCollide(p, totalVx * dt, totalVy * dt);

      if (p.onGround) p.jumpsLeft = PL.MAX_JUMPS;

      // Zbrane se nedaji prepinat - mas pistol nebo to co ti padlo
      // (input.switch ignorujeme)

      // Strelba
      if (allowShoot && inp.shoot) {
        this.tryShoot(p);
      }

      if (p.y > SHARED.PLAYER.DEATH_Y) {
        this.killPlayer(p, null, "fall");
      }
    }
  }

  moveAndCollide(p, dx, dy) {
    const W = SHARED.PLAYER.WIDTH;
    const H = SHARED.PLAYER.HEIGHT;
    p.onGround = false;

    p.x += dx;
    for (const plat of this.platforms) {
      if (plat.destroyed) continue;
      if (aabb(p.x, p.y, W, H, plat.x, plat.y, plat.w, plat.h)) {
        if (dx > 0) p.x = plat.x - W;
        else if (dx < 0) p.x = plat.x + plat.w;
        p.vx = 0;
        p.knockbackVx *= 0.4;
      }
    }

    p.y += dy;
    for (const plat of this.platforms) {
      if (plat.destroyed) continue;
      if (aabb(p.x, p.y, W, H, plat.x, plat.y, plat.w, plat.h)) {
        if (dy > 0) {
          p.y = plat.y - H;
          p.onGround = true;
          p.vy = 0;
          p.knockbackVy = 0;
        } else if (dy < 0) {
          p.y = plat.y + plat.h;
          p.vy = 0;
          p.knockbackVy *= 0.5;
        }
      }
    }

    if (p.x < -40) p.x = -40;
    if (p.x > SHARED.WORLD_WIDTH - W + 40) p.x = SHARED.WORLD_WIDTH - W + 40;
  }

  tryShoot(p) {
    const wepDef = SHARED.WEAPONS[p.weapon];
    if (!wepDef) return;
    const now = this.tickCount / SHARED.TICK_RATE;
    if (now - p.lastShotAt < wepDef.fireRate) return;
    if (p.ammo <= 0) {
      p.weapon = "pistol";
      p.ammo = Infinity;
      return;
    }

    p.shotCountWindow.push(now);
    while (p.shotCountWindow.length && now - p.shotCountWindow[0] > 1.0) {
      p.shotCountWindow.shift();
    }
    const maxPerSecond = Math.ceil(1 / wepDef.fireRate) + 2;
    if (p.shotCountWindow.length > maxPerSecond) return;

    p.lastShotAt = now;
    if (p.ammo !== Infinity) p.ammo--;

    let ax = p.input.aimX;
    let ay = p.input.aimY;
    let amag = Math.hypot(ax, ay);
    if (amag < 0.01) {
      ax = p.facing; ay = 0; amag = 1;
    }
    ax /= amag; ay /= amag;
    p.facing = ax >= 0 ? 1 : -1;

    const muzzleX = p.x + SHARED.PLAYER.WIDTH / 2 + ax * 22;
    const muzzleY = p.y + SHARED.PLAYER.HEIGHT * 0.4 + ay * 10;

    for (let i = 0; i < wepDef.pelletsPerShot; i++) {
      const spread = wepDef.spread > 0 ? (Math.random() - 0.5) * 2 * wepDef.spread : 0;
      const speedJitter = 1 + (Math.random() - 0.5) * 0.1;
      const cs = Math.cos(spread);
      const sn = Math.sin(spread);
      const dx = ax * cs - ay * sn;
      const dy = ax * sn + ay * cs;
      const speed = wepDef.bulletSpeed * speedJitter;

      this.bullets.push({
        id: newId(), ownerId: p.id, weapon: p.weapon,
        x: muzzleX, y: muzzleY,
        vx: dx * speed, vy: dy * speed,
        gravity: wepDef.bulletGravity * SHARED.GRAVITY,
        life: wepDef.bulletLife,
        radius: wepDef.bulletRadius,
        damage: wepDef.damage,
        knockback: wepDef.knockback,
        color: wepDef.color,
        isRocket: !!wepDef.isRocket,
        isLaser: !!wepDef.isLaser,
        isGrenade: !!wepDef.isGrenade,
        isPunch: !!wepDef.isPunch,
        isAwp: !!wepDef.isAwp,
        splashDamage: wepDef.splashDamage || 0,
        splashRadius: wepDef.splashRadius || 0,
        fuseTime: wepDef.fuseTime,
        fuseRemaining: wepDef.fuseTime,
      });
    }

    p.knockbackVx -= ax * wepDef.recoil;
    p.knockbackVy -= ay * wepDef.recoil * 0.5;

    this.events.push({
      type: "muzzle", x: muzzleX, y: muzzleY,
      dx: ax, dy: ay, weapon: p.weapon, shooterId: p.id,
    });
  }

  simulateBullets(dt) {
    const next = [];
    for (const b of this.bullets) {
      b.life -= dt;
      // Granate ma fuseTime - kdyz dojde, vybuchne na miste
      if (b.isGrenade) {
        b.fuseRemaining = (b.fuseRemaining || b.fuseTime || 1.6) - dt;
        if (b.fuseRemaining <= 0) {
          this.explode(b);
          continue; // konec, vybuchla
        }
      }
      if (b.life <= 0) {
        // Granate vybuchne i pri vyprseni life
        if (b.isGrenade) this.explode(b);
        continue;
      }

      b.vy += b.gravity * dt;
      const stepX = b.vx * dt;
      const stepY = b.vy * dt;

      const distance = Math.hypot(stepX, stepY);
      const steps = Math.max(1, Math.ceil(distance / 18));
      let alive = true;
      for (let s = 0; s < steps && alive; s++) {
        b.x += stepX / steps;
        b.y += stepY / steps;

        if (b.x < -50 || b.x > SHARED.WORLD_WIDTH + 50 || b.y > SHARED.WORLD_HEIGHT + 200) {
          alive = false;
          break;
        }

        for (const p of this.players.values()) {
          if (!p.alive) continue;
          if (p.id === b.ownerId) continue;
          // Friendly fire prevention pro team modes
          const owner = this.players.get(b.ownerId);
          if (owner && owner.team && p.team && owner.team === p.team) {
            continue; // stejny tym - neudelej damage
          }
          // Granate se neaktivuje primym kontaktem - prosti odhodi
          if (b.isGrenade) {
            if (
              b.x > p.x && b.x < p.x + SHARED.PLAYER.WIDTH &&
              b.y > p.y && b.y < p.y + SHARED.PLAYER.HEIGHT
            ) {
              // Granate se odrazi od hrace - posli ji jinam (mensi sila)
              b.vx *= -0.4;
              b.vy *= -0.4;
              break;
            }
            continue;
          }
          if (
            b.x > p.x && b.x < p.x + SHARED.PLAYER.WIDTH &&
            b.y > p.y && b.y < p.y + SHARED.PLAYER.HEIGHT
          ) {
            this.applyBulletHit(b, p);
            alive = false;
            break;
          }
        }
        if (!alive) break;

        for (const plat of this.platforms) {
          if (plat.destroyed) continue;
          if (b.x > plat.x && b.x < plat.x + plat.w &&
              b.y > plat.y && b.y < plat.y + plat.h) {
            // Granate se odrazi od platformy
            if (b.isGrenade) {
              // Zjisti zda odraz vertikalni nebo horizontalni
              // Pokud zhora, vy se otoci (a tlumi)
              const wasAbove = (b.y - stepY / steps) <= plat.y;
              const wasLeft = (b.x - stepX / steps) <= plat.x;
              const wasRight = (b.x - stepX / steps) >= plat.x + plat.w;
              if (wasAbove || (b.y - stepY/steps) >= plat.y + plat.h) {
                b.vy *= -0.45; // tlumeni
                if (wasAbove) b.y = plat.y - 1;
                else b.y = plat.y + plat.h + 1;
              } else if (wasLeft || wasRight) {
                b.vx *= -0.5;
                if (wasLeft) b.x = plat.x - 1;
                else b.x = plat.x + plat.w + 1;
              } else {
                b.vy *= -0.45;
              }
              // Ztrata energie (rolling friction)
              b.vx *= 0.85;
              break; // pokracuj v simulaci
            }
            this.applyBulletPlatformHit(b, plat);
            alive = false;
            break;
          }
        }
      }

      if (alive) next.push(b);
    }
    this.bullets = next;
  }

  applyBulletHit(b, victim) {
    if (b.isRocket) {
      // Pred explozi - pridej extra direct hit damage (raketa trefila primo)
      victim.hp -= b.damage;
      this.events.push({
        type: "hit", x: b.x, y: b.y,
        victimId: victim.id, damage: b.damage, weapon: b.weapon,
      });
      this.explode(b);
    } else {
      victim.hp -= b.damage;
      const mag = Math.hypot(b.vx, b.vy) || 1;
      const dirX = b.vx / mag;
      const dirY = b.vy / mag;
      // Special handling pro punch - ultra knockback do strany + hodne nahoru
      if (b.isPunch) {
        victim.knockbackVx += dirX * b.knockback;
        victim.knockbackVy += dirY * b.knockback * 0.4 - 600; // velky uplift nahoru
      } else {
        victim.knockbackVx += dirX * b.knockback;
        victim.knockbackVy += dirY * b.knockback - 60;
      }
      this.events.push({
        type: "hit", x: b.x, y: b.y,
        victimId: victim.id, damage: b.damage, weapon: b.weapon,
      });
      if (victim.hp <= 0) {
        this.killPlayer(victim, b.ownerId, b.weapon);
      }
    }
  }

  applyBulletPlatformHit(b, plat) {
    if (b.isRocket) {
      this.explode(b);
    } else {
      this.events.push({ type: "spark", x: b.x, y: b.y, weapon: b.weapon });
      if (plat.destructible && !plat.destroyed) {
        plat.hp -= b.damage;
        if (plat.hp <= 0) {
          plat.destroyed = true;
          this.events.push({
            type: "platform_destroyed",
            x: plat.x + plat.w / 2,
            y: plat.y + plat.h / 2,
          });
        }
      }
    }
  }

  explode(b) {
    this.events.push({ type: "explosion", x: b.x, y: b.y, radius: b.splashRadius });
    const owner = this.players.get(b.ownerId);
    for (const p of this.players.values()) {
      if (!p.alive) continue;
      // Friendly fire prevention pro team modes (splash damage)
      if (owner && owner.team && p.team && owner.team === p.team && p.id !== b.ownerId) {
        continue; // stejny tym - skip
      }
      const cx = p.x + SHARED.PLAYER.WIDTH / 2;
      const cy = p.y + SHARED.PLAYER.HEIGHT / 2;
      const dist = Math.hypot(cx - b.x, cy - b.y);
      if (dist < b.splashRadius) {
        const linearFalloff = 1 - dist / b.splashRadius;
        // Damage stale linearni
        const dmg = (p.id === b.ownerId
          ? Math.round(b.splashDamage * 0.5 * linearFalloff)
          : Math.round(b.splashDamage * linearFalloff));
        if (p.id !== b.ownerId || dmg > 0) p.hp -= dmg;
        // Knockback - kvadraticky falloff (vetsi rozdil mezi blizko a daleko)
        // + minimum knockback ze i daleky zasah te postrci
        const knockFalloff = Math.max(0.35, linearFalloff * linearFalloff);
        const nx = (cx - b.x) / (dist || 1);
        const ny = (cy - b.y) / (dist || 1);
        const force = b.knockback * knockFalloff;
        p.knockbackVx += nx * force;
        // Vetsi vertikalni boost - rakety hraci vyhozuji do vzduchu
        p.knockbackVy += ny * force - 350;
        if (p.hp <= 0) {
          this.killPlayer(p, b.ownerId, "rocket");
        }
      }
    }
    for (const plat of this.platforms) {
      if (!plat.destructible || plat.destroyed) continue;
      const cx = plat.x + plat.w / 2;
      const cy = plat.y + plat.h / 2;
      const dist = Math.hypot(cx - b.x, cy - b.y);
      if (dist < b.splashRadius) {
        plat.hp -= Math.round(b.splashDamage * (1 - dist / b.splashRadius));
        if (plat.hp <= 0) {
          plat.destroyed = true;
          this.events.push({ type: "platform_destroyed", x: cx, y: cy });
        }
      }
    }
  }

  killPlayer(victim, killerId, cause) {
    victim.alive = false;
    victim.hp = 0;
    victim.deaths++;
    // Tracking statistik - jen pro prihlasene hrace
    if (victim.username && users[victim.username]) {
      if (!users[victim.username].stats) users[victim.username].stats = { gamesPlayed: 0, kills: 0, deaths: 0, wins: 0, playTimeMs: 0, xp: 0 };
      users[victim.username].stats.deaths++;
      saveUser(victim.username);
    }
    if (killerId && killerId !== victim.id) {
      const k = this.players.get(killerId);
      if (k) {
        k.kills++;
        if (k.username && users[k.username]) {
          if (!users[k.username].stats) users[k.username].stats = { gamesPlayed: 0, kills: 0, deaths: 0, wins: 0, playTimeMs: 0, xp: 0 };
          users[k.username].stats.kills++;
          users[k.username].stats.xp = (users[k.username].stats.xp || 0) + XP_REWARDS.kill;
          saveUser(k.username);
          // Send notifikaci o XP
          emitToUser(k.username, "xp_gained", { amount: XP_REWARDS.kill, reason: "Kill", totalXP: users[k.username].stats.xp });
        }
      }
    }
    this.events.push({ type: "death", victimId: victim.id, killerId, cause });

    const mode = this.matchSettings.gameMode;

    // V TDM/CTF/GunGame - nastav respawn timer
    if (mode === "tdm" || mode === "ctf" || mode === "gungame") {
      victim.respawnAt = 2.5; // 2.5s respawn
    }

    // TDM - kazdy kill da 1 bod tymu killera
    if (mode === "tdm" && killerId && killerId !== victim.id) {
      const k = this.players.get(killerId);
      if (k && k.team) {
        this.teamScores[k.team] = (this.teamScores[k.team] || 0) + 1;
      }
    }

    // CTF - pokud victim nesl vlajku, vrat ji
    if (mode === "ctf" && victim.hasFlag) {
      const flag = this.flags[victim.hasFlag];
      if (flag) {
        // Pokud spadl do void (fall) NEBO je pod death zone, vrat vlajku rovnou na base
        const fellIntoVoid = cause === "fall" || victim.y > SHARED.WORLD_HEIGHT;
        if (fellIntoVoid) {
          flag.x = flag.baseX;
          flag.y = flag.baseY;
          flag.atBase = true;
          flag.holderId = null;
          flag.dropTime = null;
          this.events.push({ type: "flag_returned", team: victim.hasFlag, reason: "fell_into_void" });
        } else {
          // Normalni smrt - vlajka padne na zem, auto-return po 10s
          flag.holderId = null;
          flag.atBase = false;
          flag.x = victim.x;
          flag.y = victim.y;
          flag.dropTime = Date.now();
        }
      }
      victim.hasFlag = null;
    }

    // GunGame - posun killer na dalsi zbran
    if (mode === "gungame" && killerId && killerId !== victim.id) {
      const k = this.players.get(killerId);
      if (k) {
        const cur = this.gunGameProgress.get(k.id) || 0;
        const next = cur + 1;
        this.gunGameProgress.set(k.id, next);
        // Posledni zbran -> killer vyhraje match
        if (next >= Game.GUN_GAME_CHAIN.length) {
          this.matchWinner = k.id;
          this.events.push({ type: "gungame_win", playerId: k.id, name: k.name });
        } else {
          // Aktualizuj zbran
          k.weapon = Game.GUN_GAME_CHAIN[next];
          k.ammo = Infinity;
          this.events.push({ type: "gungame_level_up", playerId: k.id, level: next, weapon: k.weapon });
        }
      }
    }
  }

  simulatePickups(dt) {
    this.pickupSpawnTimer -= dt;
    if (this.pickupSpawnTimer <= 0 && this.pickups.length < SHARED.PICKUP.MAX_ON_MAP) {
      this.spawnPickup();
      this.pickupSpawnTimer = SHARED.PICKUP.SPAWN_INTERVAL;
    }

    for (const pu of this.pickups) {
      if (!pu.landed) {
        pu.vy += SHARED.PICKUP.FALL_GRAVITY * dt;
        pu.y += pu.vy * dt;
        for (const plat of this.platforms) {
          if (plat.destroyed) continue;
          if (
            pu.x + SHARED.PICKUP.WIDTH > plat.x &&
            pu.x < plat.x + plat.w &&
            pu.y + SHARED.PICKUP.HEIGHT > plat.y &&
            pu.y + SHARED.PICKUP.HEIGHT < plat.y + plat.h + 30 &&
            pu.vy >= 0
          ) {
            pu.y = plat.y - SHARED.PICKUP.HEIGHT;
            pu.vy = 0;
            pu.landed = true;
            break;
          }
        }
        if (pu.y > SHARED.PLAYER.DEATH_Y) pu.dead = true;
      }
    }
    this.pickups = this.pickups.filter((p) => !p.dead);

    for (const p of this.players.values()) {
      if (!p.alive) continue;
      for (const pu of this.pickups) {
        if (pu.dead) continue;
        if (
          p.x < pu.x + SHARED.PICKUP.WIDTH &&
          p.x + SHARED.PLAYER.WIDTH > pu.x &&
          p.y < pu.y + SHARED.PICKUP.HEIGHT &&
          p.y + SHARED.PLAYER.HEIGHT > pu.y
        ) {
          if (pu.weapon === "medkit") {
            // Medkit - heal +50 HP (max 100)
            const before = p.hp;
            p.hp = Math.min(SHARED.PLAYER.MAX_HEALTH, p.hp + 50);
            pu.dead = true;
            this.events.push({
              type: "pickup", playerId: p.id, weapon: "medkit",
              x: pu.x, y: pu.y, heal: p.hp - before,
            });
          } else {
            // Standard zbran pickup
            p.weapon = pu.weapon;
            const wd = SHARED.WEAPONS[pu.weapon];
            p.ammo = wd.ammo;
            pu.dead = true;
            this.events.push({
              type: "pickup", playerId: p.id, weapon: pu.weapon,
              x: pu.x, y: pu.y,
            });
          }
        }
      }
    }
    this.pickups = this.pickups.filter((p) => !p.dead);
  }

  spawnPickup() {
    // Vetsi sance na zbrane, mensi na medkit
    const r = Math.random();
    let weapon;
    if (r < 0.18)      weapon = "medkit";    // 18% medkit
    else if (r < 0.36) weapon = "shotgun";   // 18% shotgun
    else if (r < 0.52) weapon = "rocket";    // 16% rocket
    else if (r < 0.68) weapon = "laser";     // 16% laser
    else if (r < 0.82) weapon = "awp";       // 14% awp
    else if (r < 0.92) weapon = "grenade";   // 10% grenade
    else               weapon = "punch";     // 8% punch
    const x = 100 + Math.random() * (SHARED.WORLD_WIDTH - 200);
    this.pickups.push({
      id: newId(), x, y: -40, vy: 0, weapon,
      landed: false, dead: false,
    });
  }

  checkWinCondition() {
    const mode = this.matchSettings.gameMode;

    // GunGame - matchWinner uz nastaven, koncime match
    if (mode === "gungame" && this.matchWinner) {
      this.endMatch();
      return;
    }

    // TDM - kdo dosahne winScore * 5 killu vyhrava match
    if (mode === "tdm") {
      const target = this.matchSettings.winScore * 5; // 5 killu = 1 "win"
      if (this.teamScores.red >= target) {
        this.matchWinner = "red";
        this.endMatch();
        return;
      }
      if (this.teamScores.blue >= target) {
        this.matchWinner = "blue";
        this.endMatch();
        return;
      }
      // V TDM hraje porad - respawn po smrti, neresetujeme kola
      return;
    }

    // CTF - kdo prvni capturne 3 vlajky vyhrava match
    if (mode === "ctf") {
      const target = this.matchSettings.winScore;
      if (this.teamScores.red >= target) {
        this.matchWinner = "red";
        this.endMatch();
        return;
      }
      if (this.teamScores.blue >= target) {
        this.matchWinner = "blue";
        this.endMatch();
        return;
      }
      return; // CTF nekonci na deaths
    }

    // FFA (default) - posledni alive vyhrava kolo
    const alive = [...this.players.values()].filter((p) => p.alive);
    if (this.players.size >= 2 && alive.length <= 1) {
      this.endRound(alive[0]?.id || null);
    } else if (this.players.size === 1 && alive.length === 0) {
      this.endRound(null);
    }
  }

  // Pomocna funkce - ukoncuje match (pro TDM/CTF/GunGame ktere nemaji kola)
  endMatch() {
    this.phase = "matchover";
    this.phaseTimer = SHARED.ROUND.POST_MATCH;
    this.events.push({ type: "match_over", winner: this.matchWinner });

    // Tracking statistik + XP pro vsechny hrace (jako v endRound)
    const now = Date.now();
    const mode = this.matchSettings.gameMode;
    for (const p of this.players.values()) {
      if (p.isBot || !p.username) continue;
      if (!users[p.username]) continue;
      if (!users[p.username].stats) users[p.username].stats = { gamesPlayed: 0, kills: 0, deaths: 0, wins: 0, playTimeMs: 0, xp: 0 };
      users[p.username].stats.gamesPlayed++;
      let xpEarned = XP_REWARDS.matchPlayed;
      let reason = "Match played";

      // Vyherce - vyhodnoceni podle modu
      let isWinner = false;
      if (mode === "gungame") {
        // matchWinner = playerId
        isWinner = (p.id === this.matchWinner);
      } else if (mode === "tdm" || mode === "ctf") {
        // matchWinner = "red"/"blue", porovnat s teamem
        isWinner = (p.team === this.matchWinner);
      } else {
        // FFA - playerId
        isWinner = (p.id === this.matchWinner);
      }

      if (isWinner) {
        users[p.username].stats.wins++;
        xpEarned += XP_REWARDS.win;
        reason = "Match won!";
      }
      users[p.username].stats.xp = (users[p.username].stats.xp || 0) + xpEarned;
      if (p.matchStartTime) {
        users[p.username].stats.playTimeMs += (now - p.matchStartTime);
        p.matchStartTime = now;
      }
      saveUser(p.username);
      emitToUser(p.username, "xp_gained", { amount: xpEarned, reason, totalXP: users[p.username].stats.xp });
    }
  }

  // CTF flag logic - pickup, capture, drop, return
  simulateCTF(dt) {
    const PL = SHARED.PLAYER;
    const FLAG_RETURN_TIME = 10; // 10s na zemi -> auto return na base

    for (const team of ["red", "blue"]) {
      const flag = this.flags[team];
      if (!flag) continue;

      // Pokud nese vlajku hrac, posunout s nim
      if (flag.holderId) {
        const holder = this.players.get(flag.holderId);
        if (holder && holder.alive) {
          flag.x = holder.x + PL.WIDTH / 2;
          flag.y = holder.y - 20;
          // Capture? Kdyz holder dosahne sve vlastni vlajkove base s vlajkou nepritele
          const homeFlag = this.flags[holder.team];
          if (homeFlag && homeFlag.atBase) {
            const dx = flag.x - homeFlag.baseX;
            const dy = flag.y - homeFlag.baseY;
            if (Math.hypot(dx, dy) < 60) {
              // Capture!
              this.teamScores[holder.team] = (this.teamScores[holder.team] || 0) + 1;
              this.events.push({ type: "flag_captured", team: holder.team, by: holder.id, name: holder.name });
              // Vrat zachycenou vlajku zpet
              flag.x = flag.baseX; flag.y = flag.baseY;
              flag.holderId = null; flag.atBase = true;
              holder.hasFlag = null;
            }
          }
          continue;
        } else {
          // Holder umrel/zmizel - vlajka spadne (uz reseno v killPlayer pro death)
          flag.holderId = null;
        }
      }

      // Safeguard - pokud je vlajka mimo svet (void/pod death zone), vrat na base
      if (!flag.holderId && !flag.atBase && flag.y > SHARED.WORLD_HEIGHT) {
        flag.x = flag.baseX;
        flag.y = flag.baseY;
        flag.atBase = true;
        flag.dropTime = null;
        this.events.push({ type: "flag_returned", team, reason: "void" });
        continue;
      }

      // Auto-return po 10s na zemi (mimo base)
      if (!flag.atBase && !flag.holderId) {
        if (!flag.dropTime) flag.dropTime = Date.now();
        if (Date.now() - flag.dropTime > FLAG_RETURN_TIME * 1000) {
          flag.x = flag.baseX; flag.y = flag.baseY;
          flag.atBase = true;
          flag.dropTime = null;
          this.events.push({ type: "flag_returned", team });
        }
      }

      // Hrac sebere vlajku
      for (const p of this.players.values()) {
        if (!p.alive || p.hasFlag) continue;
        if (flag.holderId) break; // uz ji nekdo nese
        // Sebere protivnikovu vlajku
        if (p.team && p.team !== team) {
          const dx = (p.x + PL.WIDTH / 2) - flag.x;
          const dy = (p.y + PL.HEIGHT / 2) - flag.y;
          if (Math.hypot(dx, dy) < 30) {
            flag.holderId = p.id;
            flag.atBase = false;
            flag.dropTime = null;
            p.hasFlag = team;
            this.events.push({ type: "flag_pickup", team, by: p.id, name: p.name });
            break;
          }
        }
        // Hrac muze vratit svou padlou vlajku tim ze do ni vrazi
        if (p.team === team && !flag.atBase) {
          const dx = (p.x + PL.WIDTH / 2) - flag.x;
          const dy = (p.y + PL.HEIGHT / 2) - flag.y;
          if (Math.hypot(dx, dy) < 30) {
            flag.x = flag.baseX; flag.y = flag.baseY;
            flag.atBase = true;
            flag.dropTime = null;
            this.events.push({ type: "flag_returned", team, by: p.id });
            break;
          }
        }
      }
    }
  }

  // Respawn hrace v non-FFA modech
  respawnPlayer(p) {
    const mode = this.matchSettings.gameMode;
    // Vyber spawn (vlastni team strana mapy)
    const spawns = this.map.spawns;
    let pool = spawns;
    if ((mode === "tdm" || mode === "ctf") && p.team) {
      const midX = SHARED.WORLD_WIDTH / 2;
      pool = spawns.filter(s => p.team === "red" ? s.x < midX : s.x >= midX);
      if (pool.length === 0) pool = spawns;
    }
    const sp = pool[Math.floor(Math.random() * pool.length)];
    p.x = sp.x; p.y = sp.y;
    p.vx = 0; p.vy = 0;
    p.knockbackVx = 0; p.knockbackVy = 0;
    p.hp = SHARED.PLAYER.MAX_HEALTH;
    p.alive = true;
    p.jumpsLeft = SHARED.PLAYER.MAX_JUMPS;
    p.respawnAt = 0;
    p.hasFlag = null;
    // GunGame - obnov zbran podle progress
    if (mode === "gungame") {
      const idx = this.gunGameProgress.get(p.id) || 0;
      p.weapon = Game.GUN_GAME_CHAIN[idx] || "pistol";
      p.ammo = Infinity;
    } else {
      p.weapon = "pistol";
      p.ammo = Infinity;
    }
    this.events.push({ type: "respawn", playerId: p.id, x: p.x, y: p.y });
  }

  snapshot() {
    return {
      tick: this.tickCount,
      time: this.tickCount / SHARED.TICK_RATE,
      phase: this.phase,
      phaseTimer: +this.phaseTimer.toFixed(2),
      roundNumber: this.roundNumber,
      lastWinner: this.lastWinner,
      matchWinner: this.matchWinner,
      mapKey: this.mapKey,
      platforms: this.platforms.map((p, i) => ({
        i, destroyed: !!p.destroyed,
        hp: p.destructible ? p.hp : undefined,
      })),
      players: [...this.players.values()].map((p) => ({
        id: p.id, name: p.name, color: p.color,
        x: +p.x.toFixed(2), y: +p.y.toFixed(2),
        facing: p.facing,
        hp: Math.max(0, Math.round(p.hp)),
        alive: p.alive, weapon: p.weapon,
        ammo: p.ammo === Infinity ? -1 : p.ammo,
        score: p.score, kills: p.kills, deaths: p.deaths,
        ready: p.ready,
        isAdmin: !!p.isAdmin,
        isTester: !!p.isTester,
        ping: p.isBot ? 0 : (p.ping || 0),
        team: p.team,
        hasFlag: p.hasFlag,
        respawnAt: +(p.respawnAt || 0).toFixed(2),
      })),
      bullets: this.bullets.map((b) => ({
        id: b.id, x: +b.x.toFixed(1), y: +b.y.toFixed(1),
        vx: +b.vx.toFixed(1), vy: +b.vy.toFixed(1),
        weapon: b.weapon, color: b.color, radius: b.radius,
        isRocket: b.isRocket, isLaser: b.isLaser,
        isGrenade: b.isGrenade, isPunch: b.isPunch, isAwp: b.isAwp,
        fuseRemaining: b.fuseRemaining,
      })),
      pickups: this.pickups.map((pu) => ({
        id: pu.id, x: +pu.x.toFixed(1), y: +pu.y.toFixed(1), weapon: pu.weapon,
      })),
      gameMode: this.matchSettings.gameMode,
      teamScores: this.teamScores,
      flags: {
        red: this.flags.red ? {
          x: +this.flags.red.x.toFixed(1), y: +this.flags.red.y.toFixed(1),
          baseX: this.flags.red.baseX, baseY: this.flags.red.baseY,
          holderId: this.flags.red.holderId, atBase: this.flags.red.atBase,
        } : null,
        blue: this.flags.blue ? {
          x: +this.flags.blue.x.toFixed(1), y: +this.flags.blue.y.toFixed(1),
          baseX: this.flags.blue.baseX, baseY: this.flags.blue.baseY,
          holderId: this.flags.blue.holderId, atBase: this.flags.blue.atBase,
        } : null,
      },
      events: this.events,
    };
  }
}

// ============================================================
// HTTP server + Socket.io (driv index.js)
// ============================================================

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 10000,
  pingTimeout: 8000,
});

// ============================================================
// ADMIN HESLO
// Nastav promennou prostredi ADMIN_PASSWORD na Renderu (Settings > Environment)
// Pokud neni nastavena, pouzije se default - ZMEN HO!
// Pouzivani: v chatu napis  /login <heslo>
// ============================================================
// ============================================================
// USER ACCOUNT SYSTEM - registrace + login + persistence
// Pouziva se pro: prihlaseni hracu (jmeno = username), admin
// Data se ukladaji do users.json (prezije sleep, smazane pri redeployi)
// ============================================================
// ============================================================
// RANK SYSTEM
// ============================================================
// 7 ranků × 3 podúrovně = 21 levelů
// XP za akce: kill +10, win +50, played match +5, survival +5

const RANK_XP = {
  // Kazdy rank ma 3 podurovne (1, 2, 3); cisla = XP threshold pro VSTUP
  "Bronze 1":      0,
  "Bronze 2":      50,
  "Bronze 3":      120,
  "Silver 1":      220,
  "Silver 2":      350,
  "Silver 3":      520,
  "Gold 1":        750,
  "Gold 2":        1050,
  "Gold 3":        1450,
  "Platinum 1":    1950,
  "Platinum 2":    2550,
  "Platinum 3":    3300,
  "Diamond 1":     4200,
  "Diamond 2":     5300,
  "Diamond 3":     6600,
  "Master 1":      8200,
  "Master 2":      10100,
  "Master 3":      12500,
  "Grandmaster 1": 15500,
  "Grandmaster 2": 19500,
  "Grandmaster 3": 25000,
};
const RANK_NAMES = Object.keys(RANK_XP);

const XP_REWARDS = {
  kill: 10,
  win: 50,
  matchPlayed: 5,
  survival: 5, // bonus za preziti kola
};

// Vrati { name, level, currentXP, nextThreshold, progress } na zaklade XP
function getRankInfo(xp) {
  xp = Math.max(0, xp || 0);
  let currentName = RANK_NAMES[0];
  let currentThreshold = 0;
  let nextThreshold = RANK_XP[RANK_NAMES[1]];
  for (let i = RANK_NAMES.length - 1; i >= 0; i--) {
    const name = RANK_NAMES[i];
    if (xp >= RANK_XP[name]) {
      currentName = name;
      currentThreshold = RANK_XP[name];
      nextThreshold = i + 1 < RANK_NAMES.length ? RANK_XP[RANK_NAMES[i + 1]] : null;
      break;
    }
  }
  // Progress 0..1 v ramci aktualniho rankoveho intervalu
  let progress = 1;
  if (nextThreshold !== null && nextThreshold > currentThreshold) {
    progress = (xp - currentThreshold) / (nextThreshold - currentThreshold);
    progress = Math.max(0, Math.min(1, progress));
  }
  return {
    name: currentName,
    xp,
    currentThreshold,
    nextThreshold,
    progress,
  };
}

// Pridej XP usera (server-side, ulozi do DB). Vraci nove XP.
function addXP(username, amount) {
  if (!username || !users[username]) return 0;
  if (!users[username].stats) {
    users[username].stats = { gamesPlayed: 0, kills: 0, deaths: 0, wins: 0, playTimeMs: 0, xp: 0 };
  }
  if (typeof users[username].stats.xp !== "number") users[username].stats.xp = 0;
  users[username].stats.xp += amount;
  saveUser(username);
  return users[username].stats.xp;
}

// Backfill XP pro stavajici uzivatele podle jejich starych statistik
// (jednorazove pri loadu - jen pokud user nema xp pole)
function backfillXP() {
  for (const u of Object.values(users)) {
    if (!u.stats) continue;
    if (typeof u.stats.xp === "number") continue; // uz ma xp
    const k = u.stats.kills || 0;
    const w = u.stats.wins || 0;
    const g = u.stats.gamesPlayed || 0;
    u.stats.xp = (k * XP_REWARDS.kill) + (w * XP_REWARDS.win) + (g * XP_REWARDS.matchPlayed);
  }
}


const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "knockfriend2026";
const TESTER_PASSWORD = process.env.TESTER_PASSWORD || "knocktester2026";

const fs = require("fs");
const crypto = require("crypto");
const { containsProfanity, censorText } = require("./profanity");
const USERS_FILE = path.join(__dirname, "..", "data", "users.json");

// Zajisti ze data slozka existuje (pro file fallback)
const dataDir = path.dirname(USERS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// users: { username -> { username, passwordHash, salt, isAdmin, createdAt, lastLoginAt } }
let users = {};
// sessions: { token -> { username, createdAt, lastUsedAt } } - in-memory
const sessions = new Map();
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 dni

// MongoDB setup - pouzije se pokud je MONGODB_URI v env vars, jinak fallback na soubor
const MONGODB_URI = process.env.MONGODB_URI || null;
let mongoClient = null;
let mongoUsers = null; // collection
let mongoFriends = null; // collection pro pratele
let mongoFeedback = null; // collection pro feedback
let mongoDM = null; // collection pro direct messages
let mongoEnabled = false;

// Friends file fallback - jednoduchy JSON file
const FRIENDS_FILE = path.join(__dirname, "..", "data", "friends.json");
let friendsData = []; // [{ from, to, status, createdAt, acceptedAt }]

// Feedback file fallback
const FEEDBACK_FILE = path.join(__dirname, "..", "data", "feedback.json");
let feedbackData = []; // [{ username, rating, bugs, suggestions, likes, createdAt }]

// DM file fallback
const DM_FILE = path.join(__dirname, "..", "data", "dm.json");
let dmData = []; // [{ from, to, text, time, read }]

function loadFriendsFile() {
  try {
    if (fs.existsSync(FRIENDS_FILE)) {
      friendsData = JSON.parse(fs.readFileSync(FRIENDS_FILE, "utf8"));
    }
  } catch (err) {
    friendsData = [];
  }
}
function saveFriendsFile() {
  try {
    fs.writeFileSync(FRIENDS_FILE, JSON.stringify(friendsData, null, 2), "utf8");
  } catch (err) {
    console.error("[FRIENDS] Save error:", err.message);
  }
}

function loadFeedbackFile() {
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      feedbackData = JSON.parse(fs.readFileSync(FEEDBACK_FILE, "utf8"));
    }
  } catch (err) {
    feedbackData = [];
  }
}
function saveFeedbackFile() {
  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbackData, null, 2), "utf8");
  } catch (err) {
    console.error("[FEEDBACK] Save error:", err.message);
  }
}

function loadDMFile() {
  try {
    if (fs.existsSync(DM_FILE)) {
      dmData = JSON.parse(fs.readFileSync(DM_FILE, "utf8"));
    }
  } catch (err) {
    dmData = [];
  }
}
function saveDMFile() {
  try {
    fs.writeFileSync(DM_FILE, JSON.stringify(dmData, null, 2), "utf8");
  } catch (err) {
    console.error("[DM] Save error:", err.message);
  }
}

async function initMongo() {
  if (!MONGODB_URI) {
    console.log("[DB] MONGODB_URI neni nastaveny - pouzije se file storage");
    return;
  }
  try {
    const { MongoClient } = require("mongodb");
    mongoClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      // SSL/TLS nastaveni pro Render kompatibilitu
      tls: true,
      tlsAllowInvalidCertificates: false,
    });
    await mongoClient.connect();
    const db = mongoClient.db("knockfriend");
    mongoUsers = db.collection("users");
    mongoFriends = db.collection("friends");
    mongoFeedback = db.collection("feedback");
    mongoDM = db.collection("dm");
    // Vytvor unique index na username (pokud jeste neni)
    await mongoUsers.createIndex({ username: 1 }, { unique: true });
    // Index pro friends - rychle dotazy na from/to
    await mongoFriends.createIndex({ from: 1, to: 1 }, { unique: true });
    await mongoFriends.createIndex({ to: 1, status: 1 });
    await mongoFriends.createIndex({ from: 1, status: 1 });
    // Index pro feedback - sort podle data
    await mongoFeedback.createIndex({ createdAt: -1 });
    // Index pro DM - rychle dotazy podle conversation pair
    await mongoDM.createIndex({ from: 1, to: 1, time: 1 });
    await mongoDM.createIndex({ to: 1, read: 1 });
    mongoEnabled = true;
    console.log("[DB] MongoDB pripojena uspesne");
  } catch (err) {
    console.error("[DB] MongoDB chyba pripojeni:", err.message);
    console.log("[DB] Pouzije se file storage jako fallback");
    mongoEnabled = false;
  }
}

async function loadUsers() {
  if (mongoEnabled && mongoUsers) {
    try {
      const all = await mongoUsers.find({}).toArray();
      users = {};
      for (const u of all) {
        // Odstran _id (Mongo interni)
        const { _id, ...userData } = u;
        users[u.username] = userData;
      }
      console.log(`[DB] Loaded ${all.length} users from MongoDB`);
      migrateUserStats();
      return;
    } catch (err) {
      console.error("[DB] MongoDB load error:", err.message);
    }
  }
  // Fallback na soubor
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf8");
      users = JSON.parse(raw);
      console.log(`[DB] Loaded ${Object.keys(users).length} users from file`);
    }
  } catch (err) {
    console.error("[DB] File load error:", err.message);
    users = {};
  }
  migrateUserStats();
}

// Migrace - kdyby user neměl stats (existoval pred pridanim featuru)
// ============================================================
// RANK / XP SYSTEM (legacy section - actual logic is in RANK_XP/getRankInfo above)
// ============================================================

function migrateUserStats() {
  for (const u of Object.values(users)) {
    if (!u.stats) {
      u.stats = {
        gamesPlayed: 0,
        kills: 0,
        deaths: 0,
        wins: 0,
        playTimeMs: 0,
        xp: 0,
      };
    }
    // Migrace XP - pokud existujici hrac nema XP, vypocitej zpetne podle aktualnich statistik
    if (typeof u.stats.xp !== "number") {
      const k = u.stats.kills || 0;
      const w = u.stats.wins || 0;
      const g = u.stats.gamesPlayed || 0;
      u.stats.xp = (k * XP_REWARDS.kill) + (w * XP_REWARDS.win) + (g * XP_REWARDS.matchPlayed);
      console.log(`[RANK] Backfilled ${u.username}: ${u.stats.xp} XP (${k} kills, ${w} wins, ${g} games)`);
    }
  }
}

async function saveUser(username) {
  // Uloz jednoho uzivatele - efektivnejsi nez ukladat vse
  if (mongoEnabled && mongoUsers) {
    try {
      const user = users[username];
      if (!user) return;
      await mongoUsers.replaceOne(
        { username },
        user,
        { upsert: true }
      );
      return;
    } catch (err) {
      console.error("[DB] MongoDB save error:", err.message);
    }
  }
  // Fallback na soubor (uloz vse)
  saveAllUsersToFile();
}

function saveAllUsersToFile() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (err) {
    console.error("[DB] File save error:", err.message);
  }
}

// Wrapper aby existujici kod (saveUsers()) furt fungoval
function saveUsers() {
  if (mongoEnabled) {
    // Pri Mongo neukladame vse (pomale) - jen oznacime ze nekdo se zmenil
    // Volajici by mel pouzit saveUser(username) pro konkretni update
    // Ale aby kod fungoval i bez zmen, ulozime vse
    for (const u of Object.keys(users)) {
      mongoUsers.replaceOne({ username: u }, users[u], { upsert: true })
        .catch(err => console.error("[DB] save error:", err.message));
    }
  } else {
    saveAllUsersToFile();
  }
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
}

function generateSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function validateUsername(username) {
  if (typeof username !== "string") return "Invalid username";
  username = username.trim();
  if (username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 16) return "Username max 16 characters";
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return "Only letters, numbers, _ and -";
  // Cenzura - zakaz nevhodnych jmen
  if (containsProfanity(username)) return "Username contains forbidden words";
  return null; // OK
}

function validatePassword(password) {
  if (typeof password !== "string") return "Invalid password";
  if (password.length < 4) return "Password must be at least 4 characters";
  if (password.length > 64) return "Password too long";
  return null;
}

function registerUser(username, password) {
  const uErr = validateUsername(username);
  if (uErr) return { ok: false, error: uErr };
  const pErr = validatePassword(password);
  if (pErr) return { ok: false, error: pErr };

  const lcUsername = username.toLowerCase();
  // Hledej case-insensitive
  for (const u of Object.keys(users)) {
    if (u.toLowerCase() === lcUsername) {
      return { ok: false, error: "Username already taken" };
    }
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);
  users[username] = {
    username,
    passwordHash,
    salt,
    isAdmin: false,
    isTester: false,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    // Statistiky
    stats: {
      gamesPlayed: 0,    // pocet odehranych zapasu (matchu)
      kills: 0,          // celkem killu
      deaths: 0,         // celkem smrti
      wins: 0,           // pocet vyhranych matchu
      playTimeMs: 0,     // celkovy cas ve hre (millisekundy)
      xp: 0,             // experience points (pro rank)
    },
  };
  saveUsers();

  // Vytvor session
  const token = generateToken();
  sessions.set(token, { username, createdAt: Date.now(), lastUsedAt: Date.now() });

  return { ok: true, token, username, isAdmin: false, isTester: false };
}

function loginUser(username, password) {
  const uErr = validateUsername(username);
  if (uErr) return { ok: false, error: "Invalid credentials" };

  // Najdi case-insensitive
  let user = null;
  let actualUsername = null;
  const lcUsername = username.toLowerCase();
  for (const u of Object.keys(users)) {
    if (u.toLowerCase() === lcUsername) {
      user = users[u];
      actualUsername = u;
      break;
    }
  }
  if (!user) return { ok: false, error: "Invalid credentials" };

  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) return { ok: false, error: "Invalid credentials" };

  user.lastLoginAt = Date.now();
  saveUsers();

  const token = generateToken();
  sessions.set(token, { username: actualUsername, createdAt: Date.now(), lastUsedAt: Date.now() });

  return { ok: true, token, username: actualUsername, isAdmin: !!user.isAdmin, isTester: !!user.isTester };
}

function validateSession(token) {
  if (!token || typeof token !== "string") return null;
  const data = sessions.get(token);
  if (!data) return null;
  if (Date.now() - data.lastUsedAt > SESSION_LIFETIME_MS) {
    sessions.delete(token);
    return null;
  }
  data.lastUsedAt = Date.now();
  const user = users[data.username];
  if (!user) {
    sessions.delete(token);
    return null;
  }
  return { username: data.username, isAdmin: !!user.isAdmin, isTester: !!user.isTester };
}

function revokeSession(token) {
  if (token) sessions.delete(token);
}

// Cleanup starych session kazdou hodinu
setInterval(() => {
  const now = Date.now();
  for (const [t, data] of sessions) {
    if (now - data.lastUsedAt > SESSION_LIFETIME_MS) {
      sessions.delete(t);
    }
  }
}, 60 * 60 * 1000);

// Promote uzivatele na admina pomoci hesla
function promoteToAdmin(username, providedPassword) {
  if (providedPassword !== ADMIN_PASSWORD) return false;
  const user = users[username];
  if (!user) return false;
  user.isAdmin = true;
  saveUsers();
  return true;
}

// Promote uzivatele na testera
function promoteToTester(username, providedPassword) {
  if (providedPassword !== TESTER_PASSWORD) return false;
  const user = users[username];
  if (!user) return false;
  user.isTester = true;
  saveUsers();
  return true;
}

// Inicializace databaze a nacteni uzivatelu (asynchronne)
(async () => {
  await initMongo();
  await loadUsers();
  loadFriendsFile(); // file fallback pro pratele
  loadFeedbackFile(); // file fallback pro feedback
  loadDMFile(); // file fallback pro DM
})();

// Zpetna kompatibilita - admin token system jeste zustava pro chat /login prikaz
function generateAdminToken() {
  return generateToken();
}
function validateAdminToken(token) {
  const session = validateSession(token);
  return session?.isAdmin === true;
}
function revokeAdminToken(token) {
  revokeSession(token);
}

app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.json());

// User registrace
app.post("/api/register", (req, res) => {
  const { username, password } = req.body || {};
  const result = registerUser(username, password);
  res.json(result);
});

// User login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const result = loginUser(username, password);
  res.json(result);
});

// Logout - revokne session
app.post("/api/logout", (req, res) => {
  const { token } = req.body || {};
  revokeSession(token);
  res.json({ ok: true });
});

// Validace session - klient pri startu zkontroluje jestli ma platny token
app.post("/api/me", (req, res) => {
  const { token } = req.body || {};
  const session = validateSession(token);
  if (session) {
    res.json({ ok: true, username: session.username, isAdmin: session.isAdmin, isTester: session.isTester });
  } else {
    res.json({ ok: false });
  }
});

// ============================================================
// FRIENDS API
// ============================================================
// Format friendship dokumentu v Mongo:
// { from: "alice", to: "bob", status: "pending" | "accepted", createdAt: timestamp }
// "pending" znamena ze "from" poslal request "to"
// "accepted" znamena ze obema pratele
// Pri accept se vlastne dokument prepise, takze je vzdy jen 1 dokument na par.

// Helpper - vrati session nebo posle 401
function requireAuth(req, res) {
  const token = req.body?.token || req.query?.token;
  const session = validateSession(token);
  if (!session) {
    res.status(401).json({ ok: false, error: "Not logged in" });
    return null;
  }
  return session;
}

// Vyhledavani uzivatelu podle jmena (substring match, case-insensitive)
app.post("/api/users/search", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const query = (req.body?.query || "").toString().trim();
  if (query.length < 2) {
    res.json({ ok: true, users: [] });
    return;
  }
  const lcQuery = query.toLowerCase();

  // Pri Mongo se zeptame primo DB (efektivnejsi)
  if (mongoEnabled && mongoUsers) {
    try {
      const escaped = lcQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const docs = await mongoUsers.find({
        username: { $regex: escaped, $options: "i" },
      }).limit(20).toArray();
      const results = docs
        .filter((u) => u.username !== session.username)
        .map((u) => ({
          username: u.username,
          isAdmin: !!u.isAdmin,
          isTester: !!u.isTester,
        }));
      res.json({ ok: true, users: results });
      return;
    } catch (err) {
      console.error("[FRIENDS] Search error:", err.message);
    }
  }

  // Fallback - filter z in-memory users objektu
  const results = [];
  for (const [username, user] of Object.entries(users)) {
    if (username.toLowerCase().includes(lcQuery) && username !== session.username) {
      results.push({
        username,
        isAdmin: !!user.isAdmin,
        isTester: !!user.isTester,
      });
      if (results.length >= 20) break;
    }
  }
  res.json({ ok: true, users: results });
});

// Helper - emit event vsem socketum daneho usera (pro live updates)
function emitToUser(username, event, data) {
  for (const [id, sock] of io.sockets.sockets) {
    if (sock.data?.username === username) {
      sock.emit(event, data);
    }
  }
}

// ============================================================
// STATS API
// ============================================================

// Stats prihlaseneho uzivatele
app.post("/api/stats/me", (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const user = users[session.username];
  if (!user) {
    res.json({ ok: false, error: "User not found" });
    return;
  }
  const stats = user.stats || { gamesPlayed: 0, kills: 0, deaths: 0, wins: 0, playTimeMs: 0, xp: 0 };
  const rank = getRankInfo(stats.xp || 0);
  res.json({ ok: true, stats, rank });
});

// Globalni stats - soucet pres vsechny uzivatele
app.get("/api/stats/global", (_req, res) => {
  let totalPlayers = 0;
  let totalGames = 0;
  let totalKills = 0;
  let totalDeaths = 0;
  let totalPlayTimeMs = 0;
  for (const u of Object.values(users)) {
    totalPlayers++;
    if (u.stats) {
      totalGames += u.stats.gamesPlayed || 0;
      totalKills += u.stats.kills || 0;
      totalDeaths += u.stats.deaths || 0;
      totalPlayTimeMs += u.stats.playTimeMs || 0;
    }
  }
  res.json({
    ok: true,
    stats: {
      totalPlayers,
      totalGames,
      totalKills,
      totalDeaths,
      totalPlayTimeMs,
    },
  });
});

// Leaderboard - top hraci serazeni podle killu
app.get("/api/stats/leaderboard", (req, res) => {
  const sortBy = (req.query?.sort || "xp").toString();
  const limit = Math.min(parseInt(req.query?.limit) || 20, 100);

  const list = [];
  for (const [username, u] of Object.entries(users)) {
    const s = u.stats || { gamesPlayed: 0, kills: 0, deaths: 0, wins: 0, playTimeMs: 0, xp: 0 };
    const xp = s.xp || 0;
    list.push({
      username,
      isAdmin: !!u.isAdmin,
      isTester: !!u.isTester,
      gamesPlayed: s.gamesPlayed || 0,
      kills: s.kills || 0,
      deaths: s.deaths || 0,
      wins: s.wins || 0,
      playTimeMs: s.playTimeMs || 0,
      xp,
      rank: getRankInfo(xp),
    });
  }

  // Sort podle vybraneho parametru
  list.sort((a, b) => {
    if (sortBy === "wins") return b.wins - a.wins;
    if (sortBy === "games") return b.gamesPlayed - a.gamesPlayed;
    if (sortBy === "hours") return b.playTimeMs - a.playTimeMs;
    if (sortBy === "kills") return b.kills - a.kills;
    if (sortBy === "rank" || sortBy === "xp") return b.xp - a.xp;
    return b.xp - a.xp; // default - sort by XP/rank
  });

  res.json({ ok: true, players: list.slice(0, limit) });
});

// ============================================================
// FEEDBACK API
// ============================================================

// Posli feedback (kdokoli, i guest)
app.post("/api/feedback/submit", async (req, res) => {
  const rating = parseInt(req.body?.rating) || 0;
  let bugs = (req.body?.bugs || "").toString().slice(0, 1000).trim();
  let suggestions = (req.body?.suggestions || "").toString().slice(0, 1000).trim();
  let likes = (req.body?.likes || "").toString().slice(0, 500).trim();
  // Cenzura
  bugs = censorText(bugs);
  suggestions = censorText(suggestions);
  likes = censorText(likes);

  if (rating < 1 || rating > 5) {
    res.json({ ok: false, error: "Invalid rating" });
    return;
  }

  // Username z token (pokud je prihlasen) nebo anonymous
  const token = req.body?.token;
  const session = validateSession(token);
  const username = session ? session.username : "anonymous";

  const entry = {
    username,
    rating,
    bugs,
    suggestions,
    likes,
    createdAt: Date.now(),
  };

  if (mongoEnabled && mongoFeedback) {
    try {
      await mongoFeedback.insertOne(entry);
    } catch (err) {
      console.error("[FEEDBACK] Submit error:", err.message);
    }
  } else {
    feedbackData.push(entry);
    saveFeedbackFile();
  }
  console.log(`[FEEDBACK] ${username} - ${rating}* - bugs: ${bugs.slice(0, 30)} - suggestions: ${suggestions.slice(0, 30)}`);
  res.json({ ok: true });
});

// Admin endpoint - prehled vseho feedbacku
app.post("/api/feedback/list", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const user = users[session.username];
  if (!user || !user.isAdmin) {
    res.status(403).json({ ok: false, error: "Admin only" });
    return;
  }

  let all = [];
  if (mongoEnabled && mongoFeedback) {
    try {
      const docs = await mongoFeedback.find({}).sort({ createdAt: -1 }).limit(100).toArray();
      all = docs.map((d) => {
        const { _id, ...rest } = d;
        return rest;
      });
    } catch (err) {
      console.error("[FEEDBACK] List error:", err.message);
    }
  } else {
    all = feedbackData.slice().reverse().slice(0, 100);
  }

  // Statistiky
  const totalCount = all.length;
  const avgRating = totalCount > 0
    ? (all.reduce((sum, f) => sum + f.rating, 0) / totalCount).toFixed(2)
    : 0;

  res.json({ ok: true, items: all, totalCount, avgRating });
});

// Zjisti zda uzivatel uz poslal feedback (aby se neopakoval formular)
app.post("/api/feedback/check", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) {
    res.json({ ok: true, submitted: false });
    return;
  }

  let count = 0;
  if (mongoEnabled && mongoFeedback) {
    try {
      count = await mongoFeedback.countDocuments({ username: session.username });
    } catch (err) {}
  } else {
    count = feedbackData.filter((f) => f.username === session.username).length;
  }
  res.json({ ok: true, submitted: count > 0, count });
});

// Posli friend request
app.post("/api/friends/request", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const targetUsername = (req.body?.username || "").toString().trim();
  if (!targetUsername || targetUsername === session.username) {
    res.json({ ok: false, error: "Invalid target" });
    return;
  }
  if (!users[targetUsername]) {
    res.json({ ok: false, error: "User not found" });
    return;
  }

  if (mongoEnabled && mongoFriends) {
    try {
      // Zkontroluj zda uz neexistuje
      const existing = await mongoFriends.findOne({
        $or: [
          { from: session.username, to: targetUsername },
          { from: targetUsername, to: session.username },
        ],
      });
      if (existing) {
        if (existing.status === "accepted") {
          res.json({ ok: false, error: "Already friends" });
        } else if (existing.from === session.username) {
          res.json({ ok: false, error: "Request already sent" });
        } else {
          // Druhy poslal request prvni - misto duplikatu rovnou accept
          await mongoFriends.updateOne(
            { from: targetUsername, to: session.username },
            { $set: { status: "accepted", acceptedAt: Date.now() } }
          );
          emitToUser(session.username, "friends_changed", {});
          emitToUser(targetUsername, "friends_changed", {});
          res.json({ ok: true, autoAccepted: true });
        }
        return;
      }
      await mongoFriends.insertOne({
        from: session.username,
        to: targetUsername,
        status: "pending",
        createdAt: Date.now(),
      });
      // Notify obema klientum aby se panel updatnul
      emitToUser(session.username, "friends_changed", {});
      emitToUser(targetUsername, "friends_changed", {});
      res.json({ ok: true });
    } catch (err) {
      console.error("[FRIENDS] Request error:", err.message);
      res.json({ ok: false, error: "Server error" });
    }
  } else {
    // File fallback
    const existing = friendsData.find((f) =>
      (f.from === session.username && f.to === targetUsername) ||
      (f.from === targetUsername && f.to === session.username)
    );
    if (existing) {
      if (existing.status === "accepted") {
        res.json({ ok: false, error: "Already friends" });
      } else if (existing.from === session.username) {
        res.json({ ok: false, error: "Request already sent" });
      } else {
        existing.status = "accepted";
        existing.acceptedAt = Date.now();
        saveFriendsFile();
        res.json({ ok: true, autoAccepted: true });
      }
      return;
    }
    friendsData.push({
      from: session.username,
      to: targetUsername,
      status: "pending",
      createdAt: Date.now(),
    });
    saveFriendsFile();
    emitToUser(session.username, "friends_changed", {});
    emitToUser(targetUsername, "friends_changed", {});
    res.json({ ok: true });
  }
});

// Akceptuj friend request
app.post("/api/friends/accept", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const fromUsername = (req.body?.username || "").toString().trim();
  if (!fromUsername) {
    res.json({ ok: false, error: "Invalid" });
    return;
  }
  if (mongoEnabled && mongoFriends) {
    try {
      const result = await mongoFriends.updateOne(
        { from: fromUsername, to: session.username, status: "pending" },
        { $set: { status: "accepted", acceptedAt: Date.now() } }
      );
      if (result.matchedCount === 0) {
        res.json({ ok: false, error: "Request not found" });
      } else {
        emitToUser(session.username, "friends_changed", {});
        emitToUser(fromUsername, "friends_changed", {});
        res.json({ ok: true });
      }
    } catch (err) {
      res.json({ ok: false, error: "Server error" });
    }
  } else {
    const f = friendsData.find((x) => x.from === fromUsername && x.to === session.username && x.status === "pending");
    if (!f) {
      res.json({ ok: false, error: "Request not found" });
    } else {
      f.status = "accepted";
      f.acceptedAt = Date.now();
      saveFriendsFile();
      emitToUser(session.username, "friends_changed", {});
      emitToUser(fromUsername, "friends_changed", {});
      res.json({ ok: true });
    }
  }
});

// Odmítni / smaž friend request nebo přátelství
app.post("/api/friends/remove", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const otherUsername = (req.body?.username || "").toString().trim();
  if (!otherUsername) {
    res.json({ ok: false, error: "Invalid" });
    return;
  }
  if (mongoEnabled && mongoFriends) {
    try {
      await mongoFriends.deleteOne({
        $or: [
          { from: session.username, to: otherUsername },
          { from: otherUsername, to: session.username },
        ],
      });
      emitToUser(session.username, "friends_changed", {});
      emitToUser(otherUsername, "friends_changed", {});
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: false, error: "Server error" });
    }
  } else {
    friendsData = friendsData.filter((f) =>
      !((f.from === session.username && f.to === otherUsername) ||
        (f.from === otherUsername && f.to === session.username))
    );
    saveFriendsFile();
    emitToUser(session.username, "friends_changed", {});
    emitToUser(otherUsername, "friends_changed", {});
    res.json({ ok: true });
  }
});

// Get friend list - rozdeli na: friends, incoming requests, outgoing requests
app.post("/api/friends/list", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;

  let all = [];
  if (mongoEnabled && mongoFriends) {
    try {
      all = await mongoFriends.find({
        $or: [
          { from: session.username },
          { to: session.username },
        ],
      }).toArray();
    } catch (err) {
      console.error("[FRIENDS] List error:", err.message);
      res.json({ ok: false, error: "Server error" });
      return;
    }
  } else {
    all = friendsData.filter((f) => f.from === session.username || f.to === session.username);
  }

  const friends = [];
  const incoming = [];
  const outgoing = [];

  for (const f of all) {
    const other = f.from === session.username ? f.to : f.from;
    const otherUser = users[other];
    const meta = {
      username: other,
      isOnline: isUserOnline(other),
      isAdmin: !!(otherUser?.isAdmin),
      isTester: !!(otherUser?.isTester),
      currentRoom: getUserCurrentRoom(other), // v jake lobby je
    };
    if (f.status === "accepted") {
      friends.push(meta);
    } else if (f.status === "pending") {
      if (f.to === session.username) incoming.push(meta);
      else outgoing.push(meta);
    }
  }
  // Online priatele nahoru
  friends.sort((a, b) => (b.isOnline - a.isOnline) || a.username.localeCompare(b.username));
  res.json({ ok: true, friends, incoming, outgoing });
});

// Helper - zkontroluj jestli je uzivatel online (v nejakem socketu prihlasen)
function isUserOnline(username) {
  for (const [id, sock] of io.sockets.sockets) {
    if (sock.data?.username === username) return true;
  }
  return false;
}

// Vrati roomId ve kterem uzivatel hraje, nebo null
function getUserCurrentRoom(username) {
  for (const [id, sock] of io.sockets.sockets) {
    if (sock.data?.username === username) {
      const roomId = socketRoom.get(id);
      if (roomId && rooms.has(roomId)) {
        const room = rooms.get(roomId);
        // Vrati jen pokud je room otevreny (lobby/postround) - ne pendle hry
        if (room.game.phase === "lobby" || room.game.phase === "postround") {
          return roomId;
        }
      }
    }
  }
  return null;
}

// Posli pozvanku do lobby pres socket
app.post("/api/friends/invite", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const targetUsername = (req.body?.username || "").toString().trim();
  const roomId = (req.body?.roomId || "").toString().trim();
  if (!targetUsername || !roomId) {
    res.json({ ok: false, error: "Invalid request" });
    return;
  }
  if (!rooms.has(roomId)) {
    res.json({ ok: false, error: "Room not found" });
    return;
  }
  // Zkontroluj zda jsou pratele
  let areFriends = false;
  if (mongoEnabled && mongoFriends) {
    try {
      const f = await mongoFriends.findOne({
        status: "accepted",
        $or: [
          { from: session.username, to: targetUsername },
          { from: targetUsername, to: session.username },
        ],
      });
      areFriends = !!f;
    } catch (err) {}
  } else {
    areFriends = friendsData.some((f) =>
      f.status === "accepted" &&
      ((f.from === session.username && f.to === targetUsername) ||
       (f.from === targetUsername && f.to === session.username))
    );
  }
  if (!areFriends) {
    res.json({ ok: false, error: "Not friends" });
    return;
  }
  if (!isUserOnline(targetUsername)) {
    res.json({ ok: false, error: "User offline" });
    return;
  }
  // Emit invite do vsech socketu daneho uzivatele
  emitToUser(targetUsername, "lobby_invite", {
    from: session.username,
    roomId,
    timestamp: Date.now(),
  });
  res.json({ ok: true });
});

// ============================================================
// DM (DIRECT MESSAGES) API
// ============================================================
// Format zpravy v Mongo:
// { from, to, text, time, read }

// Posli DM (pres HTTP, vraci ulozenou zpravu)
app.post("/api/dm/send", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const target = (req.body?.to || "").toString().trim();
  let text = (req.body?.text || "").toString().slice(0, 500).trim();
  if (!target || !text) {
    res.json({ ok: false, error: "Invalid" });
    return;
  }
  // Cenzura DM textu
  text = censorText(text);
  if (!users[target]) {
    res.json({ ok: false, error: "User not found" });
    return;
  }
  // Zkontroluj zda jsou pratele
  let areFriends = false;
  if (mongoEnabled && mongoFriends) {
    try {
      const f = await mongoFriends.findOne({
        status: "accepted",
        $or: [
          { from: session.username, to: target },
          { from: target, to: session.username },
        ],
      });
      areFriends = !!f;
    } catch (err) {}
  } else {
    areFriends = friendsData.some((f) =>
      f.status === "accepted" &&
      ((f.from === session.username && f.to === target) ||
       (f.from === target && f.to === session.username))
    );
  }
  if (!areFriends) {
    res.json({ ok: false, error: "Not friends" });
    return;
  }

  const msg = {
    from: session.username,
    to: target,
    text,
    time: Date.now(),
    read: false,
  };

  if (mongoEnabled && mongoDM) {
    try {
      await mongoDM.insertOne(msg);
    } catch (err) {
      console.error("[DM] Send error:", err.message);
    }
  } else {
    dmData.push(msg);
    saveDMFile();
  }

  // Live push do druheho usera
  emitToUser(target, "dm_received", msg);
  emitToUser(session.username, "dm_sent", msg);

  res.json({ ok: true, message: msg });
});

// Historie DM s konkretnim friendem (oba smery)
app.post("/api/dm/history", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  const other = (req.body?.with || "").toString().trim();
  if (!other) {
    res.json({ ok: false, error: "Invalid" });
    return;
  }
  let messages = [];
  if (mongoEnabled && mongoDM) {
    try {
      messages = await mongoDM.find({
        $or: [
          { from: session.username, to: other },
          { from: other, to: session.username },
        ],
      }).sort({ time: 1 }).limit(200).toArray();
      messages = messages.map((m) => { const { _id, ...rest } = m; return rest; });
      // Oznac jako precteny pro session usera
      await mongoDM.updateMany(
        { from: other, to: session.username, read: false },
        { $set: { read: true } }
      );
    } catch (err) {
      console.error("[DM] History error:", err.message);
    }
  } else {
    messages = dmData
      .filter((m) =>
        (m.from === session.username && m.to === other) ||
        (m.from === other && m.to === session.username)
      )
      .sort((a, b) => a.time - b.time)
      .slice(-200);
    // Oznac jako precteny
    let changed = false;
    for (const m of dmData) {
      if (m.from === other && m.to === session.username && !m.read) {
        m.read = true;
        changed = true;
      }
    }
    if (changed) saveDMFile();
  }
  res.json({ ok: true, messages });
});

// Pocet neprectenych DM (pro badge)
app.post("/api/dm/unread", async (req, res) => {
  const session = requireAuth(req, res);
  if (!session) return;
  let unreadByUser = {}; // { from: count }
  if (mongoEnabled && mongoDM) {
    try {
      const docs = await mongoDM.find({ to: session.username, read: false }).toArray();
      for (const m of docs) {
        unreadByUser[m.from] = (unreadByUser[m.from] || 0) + 1;
      }
    } catch (err) {}
  } else {
    for (const m of dmData) {
      if (m.to === session.username && !m.read) {
        unreadByUser[m.from] = (unreadByUser[m.from] || 0) + 1;
      }
    }
  }
  res.json({ ok: true, unread: unreadByUser });
});

app.get("/api/rooms", (_req, res) => {
  const list = [];
  for (const [id, room] of rooms) {
    // Skry private lobby (musi mit kod aby se pripojili)
    if (room.game.matchSettings && room.game.matchSettings.isPublic === false) continue;
    list.push({
      id, name: room.name,
      playerCount: room.game.players.size,
      maxPlayers: SHARED.ROUND.MAX_PLAYERS,
      mapKey: room.game.mapKey,
      phase: room.game.phase,
    });
  }
  res.json({ rooms: list });
});

const rooms = new Map();
const socketRoom = new Map();

function genRoomId() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function createRoom(name, mapKey) {
  let id = genRoomId();
  while (rooms.has(id)) id = genRoomId();
  const game = new Game(id, mapKey);
  game.loadMap(mapKey);
  const room = { id, name: name || `Room ${id}`, game, lastActive: Date.now() };
  rooms.set(id, room);
  return room;
}

function removeEmptyRoom(roomId) {
  const r = rooms.get(roomId);
  if (r && r.game.players.size === 0) rooms.delete(roomId);
}

io.on("connection", (socket) => {
  let playerName = "Player";

  // Ping measurement - server posila ping, klient odpovi pong, mereme RTT
  socket.data.ping = 0;
  let lastPingTime = 0;
  const pingInterval = setInterval(() => {
    lastPingTime = Date.now();
    socket.emit("ping_request", { t: lastPingTime });
  }, 2000);
  socket.on("ping_response", (data) => {
    const rtt = Date.now() - (data?.t || lastPingTime);
    if (rtt >= 0 && rtt < 5000) {
      socket.data.ping = rtt;
      // Aktualizuj ping i v Game state pokud je hrac v mistnosti
      const roomId = socketRoom.get(socket.id);
      const room = rooms.get(roomId);
      if (room) {
        const p = room.game.players.get(socket.id);
        if (p) p.ping = rtt;
      }
    }
  });
  socket.on("disconnect", () => clearInterval(pingInterval));

  socket.on("hello", (data, ack) => {
    socket.data.isTouch = !!data?.isTouch;

    // Pokus se o validaci session tokenu (registrovany ucet)
    let sessionUsername = null;
    if (data?.sessionToken) {
      const session = validateSession(data.sessionToken);
      if (session) {
        sessionUsername = session.username;
        socket.data.sessionToken = data.sessionToken;
        socket.data.username = session.username;
        socket.data.isAdmin = session.isAdmin;
        socket.data.isTester = session.isTester;
      }
    }

    // Pokud nema validni session, jen pouzij jmeno z dat (guest)
    if (!sessionUsername) {
      playerName = (data?.name || "Guest").toString().slice(0, 16);
    } else {
      // Prihlaseny uzivatel - pouzij jeho username
      playerName = sessionUsername;
    }

    if (typeof ack === "function") {
      ack({
        ok: true, id: socket.id,
        username: sessionUsername,
        isAdmin: !!socket.data.isAdmin,
        isTester: !!socket.data.isTester,
        shared: serializeShared(),
        rooms: [...rooms.values()].map((r) => ({
          id: r.id, name: r.name,
          playerCount: r.game.players.size,
          maxPlayers: SHARED.ROUND.MAX_PLAYERS,
          mapKey: r.game.mapKey, phase: r.game.phase,
        })),
      });
    }
  });

  socket.on("create_room", (data, ack) => {
    const mapKey = SHARED.MAPS[data?.mapKey] ? data.mapKey : "skybridge";
    const room = createRoom(data?.name, mapKey);
    joinRoom(socket, room.id, playerName, ack);
  });

  socket.on("join_room", (data, ack) => {
    const roomId = (data?.roomId || "").toString().toUpperCase();
    const room = rooms.get(roomId);
    if (!room) {
      if (typeof ack === "function") ack({ ok: false, error: "Room not found" });
      return;
    }
    if (room.game.players.size >= SHARED.ROUND.MAX_PLAYERS) {
      if (typeof ack === "function") ack({ ok: false, error: "Room is full" });
      return;
    }
    joinRoom(socket, roomId, playerName, ack);
  });

  socket.on("quick_play", (_data, ack) => {
    let target = null;
    for (const r of rooms.values()) {
      if (r.game.phase === "lobby" && r.game.players.size < SHARED.ROUND.MAX_PLAYERS) {
        target = r;
        break;
      }
    }
    if (!target) target = createRoom("Quickplay", "skybridge");
    joinRoom(socket, target.id, playerName, ack);
  });

  socket.on("ready", (data) => {
    const roomId = socketRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    room.game.setReady(socket.id, !!data?.ready);
    room.game.tryStartMatch();
  });

  // Host muze menit nastaveni matche (jen v lobby)
  socket.on("set_match_settings", (data) => {
    const roomId = socketRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.game.setMatchSettings(socket.id, data || {})) {
      io.to(roomId).emit("room_info", roomInfo(room));
    }
  });

  // Hrac si vybere barvu
  socket.on("set_color", (data) => {
    const roomId = socketRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.game.setColor(socket.id, data?.color)) {
      io.to(roomId).emit("room_info", roomInfo(room));
    }
  });

  // Globalni admin status - per socket (drzime to mimo Game protoze
  // /login muze fungovat i mimo mistnost)
  // Pouzivame socket.data aby to bylo dostupne i z joinRoom
  socket.data.isAdmin = false;

  // Konzolove prikazy (jako CS) - pouze pro adminy (krome /login)
  let nextBotIdNum = 1;
  function consoleHandler(data) {
    const cmd = (data?.cmd || "").toString().trim();
    if (!cmd) return;

    // /login funguje VSEM, i mimo mistnost (admin/tester status je per-socket)
    if (cmd.startsWith("/login ") || cmd.startsWith("login ")) {
      const password = cmd.replace(/^\/?login\s+/, "").trim();
      if (password === ADMIN_PASSWORD) {
        socket.data.isAdmin = true;
        // Pokud je prihlaseny, ulozit do users.json (perzistentni)
        if (socket.data.username) {
          promoteToAdmin(socket.data.username, password);
          sendConsole(socket, "[OK] Admin status ulozen do uctu " + socket.data.username, "ok");
        } else {
          // Nepritlaseny - jen per-socket admin (ztrati se po reconnect)
          sendConsole(socket, "[OK] Admin status povolen (jen pro tuto session, prihlas se pro perzistenci)", "ok");
        }
        // Posli klientovi update statusu (aby se UI aktualizovalo bez reloglu)
        socket.emit("user_status_update", {
          username: socket.data.username,
          isAdmin: true,
          isTester: !!socket.data.isTester,
        });
        // Pokud je v mistnosti, oznam vsem
        const roomId = socketRoom.get(socket.id);
        const room = rooms.get(roomId);
        if (room) {
          const me = room.game.players.get(socket.id);
          if (me) {
            me.isAdmin = true;
            io.to(roomId).emit("chat", {
              id: "system",
              name: "SYSTEM",
              color: "#ffd700",
              text: `[ADMIN] ${me.name} se stal adminem`,
              time: Date.now(),
            });
            io.to(roomId).emit("room_info", roomInfo(room));
          }
        }
      } else if (password === TESTER_PASSWORD) {
        socket.data.isTester = true;
        if (socket.data.username) {
          promoteToTester(socket.data.username, password);
          sendConsole(socket, "[OK] Tester status ulozen do uctu " + socket.data.username, "ok");
        } else {
          sendConsole(socket, "[OK] Tester status povolen (jen pro tuto session, prihlas se pro perzistenci)", "ok");
        }
        socket.emit("user_status_update", {
          username: socket.data.username,
          isAdmin: !!socket.data.isAdmin,
          isTester: true,
        });
        // Oznam v mistnosti
        const roomId = socketRoom.get(socket.id);
        const room = rooms.get(roomId);
        if (room) {
          const me = room.game.players.get(socket.id);
          if (me) {
            me.isTester = true;
            io.to(roomId).emit("chat", {
              id: "system",
              name: "SYSTEM",
              color: "#54e0ff",
              text: `[TESTER] ${me.name} se stal testerem`,
              time: Date.now(),
            });
            io.to(roomId).emit("room_info", roomInfo(room));
          }
        }
      } else {
        sendConsole(socket, "[FAIL] Nespravne heslo", "error");
      }
      return;
    }

    if (cmd === "/logout" || cmd === "logout") {
      if (socket.data.isAdmin) {
        socket.data.isAdmin = false;
        revokeAdminToken(socket.data.adminToken);
        socket.data.adminToken = null;
        socket.emit("admin_token", { token: null }); // klient si smaze
        sendConsole(socket, "Admin status odebran", "info");
        const roomId = socketRoom.get(socket.id);
        const room = rooms.get(roomId);
        if (room) {
          const me = room.game.players.get(socket.id);
          if (me) {
            me.isAdmin = false;
            io.to(roomId).emit("room_info", roomInfo(room));
          }
        }
      }
      return;
    }

    // Pro vsechny ostatni prikazy musime byt v mistnosti
    const roomId = socketRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) {
      sendConsole(socket, "Nejsi v mistnosti - pouze /login je dostupny", "error");
      return;
    }

    const me = room.game.players.get(socket.id);
    if (!me) return;

    // Sync admin status z global do player objektu
    if (socket.data.isAdmin && !me.isAdmin) {
      me.isAdmin = true;
      io.to(roomId).emit("room_info", roomInfo(room));
    }
    // Sync tester status
    if (socket.data.isTester && !me.isTester) {
      me.isTester = true;
      io.to(roomId).emit("room_info", roomInfo(room));
    }

    // Admin check pro vsechny ostatni prikazy
    if (!me.isAdmin) {
      sendConsole(socket, "[FAIL] Permission denied. Pouze admin muze pouzivat konzoli.", "error");
      sendConsole(socket, "  Pro prihlaseni napis: /login <heslo>", "info");
      return;
    }

    const parts = cmd.split(/\s+/);
    const main = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      if (main === "help") {
        sendConsole(socket, "Prikazy:", "info");
        sendConsole(socket, "  /login <heslo>   - prihlasit se jako admin", "info");
        sendConsole(socket, "  /logout          - odhlasit se", "info");
        sendConsole(socket, "  bot add [jmeno]  - prida bota", "info");
        sendConsole(socket, "  bot remove       - odebere posledniho bota", "info");
        sendConsole(socket, "  bot clear        - odebere vsechny boty", "info");
        sendConsole(socket, "  bot move on/off  - boti se hybou nebo stoji", "info");
        sendConsole(socket, "  kill             - zabij sam sebe", "info");
        sendConsole(socket, "  give <weapon>    - daruj si zbran (pistol/shotgun/rocket/laser/awp/grenade/punch)", "info");
        sendConsole(socket, "  map <name>       - zmen mapu (jen v lobby)", "info");
        sendConsole(socket, "  start            - spusti zapas (i bez ready check)", "info");
        sendConsole(socket, "  list             - vypis hracu", "info");
        sendConsole(socket, "  setxp [user] N   - nastav XP (pro sebe pokud bez user)", "info");
        sendConsole(socket, "  maxrank [user]   - nastav max rank (Grandmaster 3)", "info");
      }
      else if (main === "bot" && args[0] === "add") {
        if (room.game.players.size >= SHARED.ROUND.MAX_PLAYERS) {
          return sendConsole(socket, "Mistnost je plna (max " + SHARED.ROUND.MAX_PLAYERS + ")", "error");
        }
        const botName = args[1] || ("Bot" + (nextBotIdNum++));
        const botId = "bot_" + Math.random().toString(36).slice(2, 9);
        const bot = room.game.addPlayer(botId, botName, true);
        if (bot) {
          // Pokud uz hra bezi, hned bota spawni
          if (room.game.phase !== "lobby") {
            const spawns = room.game.map.spawns;
            const s = spawns[Math.floor(Math.random() * spawns.length)];
            bot.x = s.x; bot.y = s.y;
            bot.alive = true;
            bot.hp = SHARED.PLAYER.MAX_HEALTH;
          }
          io.to(roomId).emit("room_info", roomInfo(room));
          sendConsole(socket, `Pridan bot: ${botName}`, "ok");
        } else {
          sendConsole(socket, "Nepodarilo se pridat bota", "error");
        }
      }
      else if (main === "bot" && args[0] === "remove") {
        const bots = [...room.game.players.values()].filter(p => p.isBot);
        if (!bots.length) return sendConsole(socket, "Zadny bot neni v mistnosti", "error");
        const last = bots[bots.length - 1];
        room.game.removePlayer(last.id);
        io.to(roomId).emit("room_info", roomInfo(room));
        sendConsole(socket, `Odebran bot: ${last.name}`, "ok");
      }
      else if (main === "bot" && args[0] === "clear") {
        const bots = [...room.game.players.values()].filter(p => p.isBot);
        for (const b of bots) room.game.removePlayer(b.id);
        io.to(roomId).emit("room_info", roomInfo(room));
        sendConsole(socket, `Odebrano ${bots.length} botu`, "ok");
      }
      else if (main === "bot" && args[0] === "move") {
        const enable = args[1] === "on";
        for (const p of room.game.players.values()) {
          if (p.isBot) p.botMove = enable;
        }
        sendConsole(socket, `Bot pohyb: ${enable ? "ON" : "OFF"}`, "ok");
      }
      else if (main === "kill") {
        if (me && me.alive) {
          room.game.killPlayer(me, null, "console");
          sendConsole(socket, "Sebevrazda", "ok");
        } else {
          sendConsole(socket, "Nezijes", "error");
        }
      }
      else if (main === "give") {
        const wep = args[0]?.toLowerCase();
        if (!wep || !SHARED.WEAPONS[wep]) {
          return sendConsole(socket, "Pouziti: give pistol|shotgun|rocket|laser|awp|grenade|punch", "error");
        }
        if (!me || !me.alive) return sendConsole(socket, "Nezijes", "error");
        me.weapon = wep;
        me.ammo = SHARED.WEAPONS[wep].ammo;
        sendConsole(socket, `Mas: ${SHARED.WEAPONS[wep].name}`, "ok");
      }
      else if (main === "map") {
        if (room.game.phase !== "lobby") {
          return sendConsole(socket, "Mapu lze zmenit jen v lobby", "error");
        }
        const mapKey = args[0]?.toLowerCase();
        if (!SHARED.MAPS[mapKey]) {
          return sendConsole(socket, "Mapy: " + Object.keys(SHARED.MAPS).join(", "), "error");
        }
        room.game.loadMap(mapKey);
        io.to(roomId).emit("room_info", roomInfo(room));
        sendConsole(socket, `Mapa zmenena na: ${mapKey}`, "ok");
      }
      else if (main === "start") {
        if (room.game.phase !== "lobby") {
          return sendConsole(socket, "Zapas uz bezi", "error");
        }
        if (room.game.players.size < SHARED.ROUND.MIN_PLAYERS) {
          return sendConsole(socket, `Potreba alespon ${SHARED.ROUND.MIN_PLAYERS} hracu (vc botu)`, "error");
        }
        // Forcni vsechny ready a spust
        for (const p of room.game.players.values()) p.ready = true;
        room.game.startMatch();
        sendConsole(socket, "Zapas spusten!", "ok");
      }
      else if (main === "list") {
        sendConsole(socket, `Hraci v mistnosti (${room.game.players.size}):`, "info");
        for (const p of room.game.players.values()) {
          sendConsole(socket, `  ${p.isBot ? "[BOT]" : "     "} ${p.name} (hp:${Math.round(p.hp)} ${p.alive ? "alive" : "dead"})`, "info");
        }
      }
      else if (main === "setxp") {
        // /setxp [username] <amount>  - nastavi XP uzivatele (admin only)
        if (!socket.data?.isAdmin) {
          return sendConsole(socket, "Tento prikaz je jen pro adminy", "error");
        }
        if (parts.length < 2) {
          return sendConsole(socket, "Pouziti: setxp [username] <amount>", "error");
        }
        let targetUsername, amount;
        if (parts.length === 2) {
          // /setxp <amount> - nastavi MOJE xp
          targetUsername = socket.data?.username;
          amount = parseInt(parts[1]);
        } else {
          targetUsername = parts[1];
          amount = parseInt(parts[2]);
        }
        if (!targetUsername) {
          return sendConsole(socket, "Musis byt prihlasen pro setxp na sebe", "error");
        }
        if (isNaN(amount) || amount < 0) {
          return sendConsole(socket, "Neplatne XP cislo (musi byt >= 0)", "error");
        }
        if (amount > 999999) {
          return sendConsole(socket, "Max XP: 999999", "error");
        }
        if (!users[targetUsername]) {
          return sendConsole(socket, `Uzivatel '${targetUsername}' neexistuje`, "error");
        }
        if (!users[targetUsername].stats) {
          users[targetUsername].stats = { gamesPlayed: 0, kills: 0, deaths: 0, wins: 0, playTimeMs: 0, xp: 0 };
        }
        users[targetUsername].stats.xp = amount;
        saveUsers();
        const rank = getRankInfo(amount);
        sendConsole(socket, `OK: ${targetUsername} ma teď ${amount} XP (${rank.name})`, "ok");
        // Notifikuj uzivatele jestli je online
        emitToUser(targetUsername, "xp_gained", { amount: 0, reason: "Admin set", totalXP: amount });
      }
      else if (main === "maxrank") {
        // /maxrank [username] - nastavi user na Grandmaster 3 (max XP) - admin only
        if (!socket.data?.isAdmin) {
          return sendConsole(socket, "Tento prikaz je jen pro adminy", "error");
        }
        const targetUsername = parts[1] || socket.data?.username;
        if (!targetUsername) {
          return sendConsole(socket, "Musis byt prihlasen", "error");
        }
        if (!users[targetUsername]) {
          return sendConsole(socket, `Uzivatel '${targetUsername}' neexistuje`, "error");
        }
        if (!users[targetUsername].stats) {
          users[targetUsername].stats = { gamesPlayed: 0, kills: 0, deaths: 0, wins: 0, playTimeMs: 0, xp: 0 };
        }
        users[targetUsername].stats.xp = 25000;
        saveUsers();
        sendConsole(socket, `OK: ${targetUsername} je teď Grandmaster 3 (25000 XP)`, "ok");
        emitToUser(targetUsername, "xp_gained", { amount: 0, reason: "Max rank", totalXP: 25000 });
      }
      else {
        sendConsole(socket, `Neznamy prikaz: ${main}. Napis 'help'`, "error");
      }
    } catch (e) {
      sendConsole(socket, "Chyba: " + e.message, "error");
    }
  }
  // Registrace event handleru - volá interni consoleHandler
  socket.on("console", consoleHandler);

  function sendConsole(s, text, type) {
    s.emit("console", { text, type: type || "info" });
    // Take posli jako chat (aby to videli mobilni uzivatele)
    const colors = {
      ok: "#4ade80",
      error: "#ef4444",
      info: "#94a3c4",
    };
    s.emit("chat", {
      id: "system",
      name: "CONSOLE",
      color: colors[type] || colors.info,
      text,
      time: Date.now(),
    });
  }

  socket.on("input", (data) => {
    const roomId = socketRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    room.game.setInput(socket.id, data || {});
  });

  // Chat - rate limit a max delka
  let lastChatTime = 0;
  const chatHistory = [];
  socket.on("chat", (data) => {
    const roomId = socketRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.game.players.get(socket.id);
    if (!player) return;

    const now = Date.now();
    let text = (data?.text || "").toString().slice(0, 100).trim();
    if (!text) return;

    // Cenzura - nahrazuje zakazana slova hvezdickami (jen pro normalni zpravy, prikazy nech)
    const isCommandCheck = text.startsWith("/");
    if (!isCommandCheck) {
      text = censorText(text);
    }

    // Rate limit pouze pro normalni chat zpravy, ne pro prikazy
    const isCommand = text.startsWith("/");
    if (!isCommand) {
      // Rate limit: max 1 zprava za 500ms
      if (now - lastChatTime < 500) return;
      // Anti-spam: max 5 zprav za 5 sekund
      chatHistory.push(now);
      while (chatHistory.length && now - chatHistory[0] > 5000) chatHistory.shift();
      if (chatHistory.length > 5) return;
      lastChatTime = now;
    }

    // Admin login - heslo se nikdy nesmi objevit v chatu
    if (text.startsWith("/login ")) {
      const password = text.slice(7).trim();
      if (password === ADMIN_PASSWORD) {
        player.isAdmin = true;
        socket.data.isAdmin = true;
        // Pokud je prihlaseny ucet, ulozit
        if (socket.data.username) {
          promoteToAdmin(socket.data.username, password);
        }
        // Posli klientovi update statusu (aby se UI aktualizovalo bez reloglu)
        socket.emit("user_status_update", {
          username: socket.data.username,
          isAdmin: true,
          isTester: !!socket.data.isTester,
        });
        socket.emit("chat", {
          id: "system",
          name: "SYSTEM",
          color: "#ffd700",
          text: `[OK] Admin status povolen pro ${player.name}`,
          time: now,
        });
        io.to(roomId).emit("chat", {
          id: "system",
          name: "SYSTEM",
          color: "#ffd700",
          text: `[ADMIN] ${player.name} se stal adminem`,
          time: now,
        });
        io.to(roomId).emit("room_info", roomInfo(room));
      } else if (password === TESTER_PASSWORD) {
        player.isTester = true;
        socket.data.isTester = true;
        if (socket.data.username) {
          promoteToTester(socket.data.username, password);
        }
        socket.emit("user_status_update", {
          username: socket.data.username,
          isAdmin: !!socket.data.isAdmin,
          isTester: true,
        });
        socket.emit("chat", {
          id: "system",
          name: "SYSTEM",
          color: "#54e0ff",
          text: `[OK] Tester status povolen pro ${player.name}`,
          time: now,
        });
        io.to(roomId).emit("chat", {
          id: "system",
          name: "SYSTEM",
          color: "#54e0ff",
          text: `[TESTER] ${player.name} se stal testerem`,
          time: now,
        });
        io.to(roomId).emit("room_info", roomInfo(room));
      } else {
        socket.emit("chat", {
          id: "system",
          name: "SYSTEM",
          color: "#ff5e3d",
          text: "[FAIL] Nespravne heslo",
          time: now,
        });
      }
      return; // /login se nikdy nebroadcastuje!
    }

    if (text === "/logout" && player.isAdmin) {
      player.isAdmin = false;
      socket.data.isAdmin = false;
      revokeAdminToken(socket.data.adminToken);
      socket.data.adminToken = null;
      socket.emit("admin_token", { token: null });
      socket.emit("chat", {
        id: "system",
        name: "SYSTEM",
        color: "#94a3c4",
        text: "Admin status odebran",
        time: now,
      });
      io.to(roomId).emit("room_info", roomInfo(room));
      return;
    }

    // Pokud zprava zacina lomitkem, zpracuj jako konzolovy prikaz
    // (umoznuje pouzivat /bot, /kill, /give, atd. z mobilu kde neni konzole)
    if (text.startsWith("/")) {
      const cmdText = text.slice(1).trim(); // odstran lomitko
      if (cmdText) {
        // Spust stejnou logiku jako "console" event
        consoleHandler({ cmd: cmdText });
      }
      return; // /command se nikdy nebroadcastuje
    }

    io.to(roomId).emit("chat", {
      id: socket.id,
      name: player.name,
      color: player.color,
      text,
      isAdmin: player.isAdmin,
      isTester: player.isTester,
      time: now,
    });
  });

  socket.on("leave_room", () => {
    leaveRoom(socket);
  });

  socket.on("change_map", (data) => {
    const roomId = socketRoom.get(socket.id);
    const room = rooms.get(roomId);
    if (!room) return;
    if (room.game.phase !== "lobby") return;
    if (SHARED.MAPS[data?.mapKey]) {
      room.game.loadMap(data.mapKey);
      io.to(roomId).emit("room_info", roomInfo(room));
    }
  });

  socket.on("disconnect", () => {
    leaveRoom(socket);
  });
});

function joinRoom(socket, roomId, name, ack) {
  if (socketRoom.has(socket.id)) leaveRoom(socket);

  const room = rooms.get(roomId);
  if (!room) {
    if (typeof ack === "function") ack({ ok: false, error: "Room not found" });
    return;
  }

  // Cenzura jmena - pokud je v nem profanity, zmenit na "Player"
  // (registrovany username uz prosel filterem pri registraci)
  if (typeof name === "string") {
    if (containsProfanity(name)) {
      name = "Player";
    }
  }

  // Phone-only mode - povolen jen pokud je klient na touch zarizeni
  // (host se vlastniho omezeni zbavi pres /logout/restart, ale pokud nastavi phoneOnly, musi byt taky touch)
  if (room.game.matchSettings.phoneOnly && !socket.data?.isTouch) {
    if (typeof ack === "function") ack({ ok: false, error: "This room is phone-only. Open on a mobile device." });
    return;
  }

  const p = room.game.addPlayer(socket.id, name);
  if (!p) {
    if (typeof ack === "function") ack({ ok: false, error: "Could not join" });
    return;
  }
  // Pokud je socket prihlaseny jako admin, nastav i player.isAdmin
  if (socket.data && socket.data.isAdmin) {
    p.isAdmin = true;
  }
  if (socket.data && socket.data.isTester) {
    p.isTester = true;
  }
  // Username (jen pokud je prihlasen) - pro tracking statistik
  if (socket.data && socket.data.username) {
    p.username = socket.data.username;
  }
  // Track time spent in matches
  p.matchStartTime = Date.now();
  socket.join(roomId);
  socketRoom.set(socket.id, roomId);

  console.log(`[JOIN] ${socket.id.slice(0,6)} (${name}) -> room ${roomId} - hracu v mistnosti: ${room.game.players.size}`);

  if (typeof ack === "function") {
    ack({
      ok: true, roomId, selfId: socket.id,
      mapKey: room.game.mapKey,
      shared: serializeShared(),
    });
  }
  io.to(roomId).emit("room_info", roomInfo(room));
}

function leaveRoom(socket) {
  const roomId = socketRoom.get(socket.id);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (room) {
    room.game.removePlayer(socket.id);

    // Pokud zustali jen boti, smaz cely room
    const realPlayers = [...room.game.players.values()].filter(p => !p.isBot);
    if (realPlayers.length === 0) {
      for (const p of [...room.game.players.values()]) {
        room.game.removePlayer(p.id);
      }
    }

    io.to(roomId).emit("room_info", roomInfo(room));
    if (room.game.players.size === 0) {
      removeEmptyRoom(roomId);
    } else if (room.game.phase !== "lobby" && room.game.players.size < SHARED.ROUND.MIN_PLAYERS) {
      room.game.returnToLobby();
    }
  }
  socket.leave(roomId);
  socketRoom.delete(socket.id);
}

function roomInfo(room) {
  return {
    id: room.id, name: room.name,
    mapKey: room.game.mapKey, phase: room.game.phase,
    hostId: room.game.hostId,
    matchSettings: { ...room.game.matchSettings },
    players: [...room.game.players.values()].map((p) => ({
      id: p.id, name: p.name, color: p.color,
      ready: p.ready, score: p.score,
      isAdmin: !!p.isAdmin,
      isTester: !!p.isTester,
    })),
  };
}

function serializeShared() {
  return {
    WORLD_WIDTH: SHARED.WORLD_WIDTH,
    WORLD_HEIGHT: SHARED.WORLD_HEIGHT,
    PLAYER: SHARED.PLAYER,
    WEAPONS: SHARED.WEAPONS,
    PICKUP: SHARED.PICKUP,
    MAPS: SHARED.MAPS,
    TICK_RATE: SHARED.TICK_RATE,
    ROUND: SHARED.ROUND,
    COLORS: SHARED.COLORS,
  };
}

// Hlavni simulacni smycka
const TICK_MS = 1000 / SHARED.TICK_RATE;
let lastTickTime = Date.now();

setInterval(() => {
  const now = Date.now();
  const dt = Math.min(0.1, (now - lastTickTime) / 1000);
  lastTickTime = now;

  for (const [roomId, room] of rooms) {
    room.game.update(dt);
    const snap = room.game.snapshot();
    io.to(roomId).emit("state", snap);
  }

  for (const [id, room] of rooms) {
    if (room.game.players.size === 0) rooms.delete(id);
  }
}, TICK_MS);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`KNOCKFRIEND server bezi na portu ${PORT}`);
});