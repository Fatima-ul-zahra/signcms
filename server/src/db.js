import { MongoClient } from "mongodb";
import { config } from "./config.js";

let client;
let db;

export async function connectDb() {
  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = client.db(config.mongoDb);
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("screens").createIndex({ screenId: 1 }, { unique: true }),
    db.collection("screens").createIndex({ deviceToken: 1 }),
    db.collection("pairingRequests").createIndex({ code: 1 }, { unique: true }),
    db.collection("pairingRequests").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 3600 }),
    db.collection("media").createIndex({ createdAt: -1 }),
    db.collection("playlists").createIndex({ createdAt: -1 }),
  ]);
  return db;
}

export function collection(name) {
  if (!db) throw new Error("Database is not connected");
  return db.collection(name);
}
