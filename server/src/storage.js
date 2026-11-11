import { GridFSBucket } from "mongodb";
import { getDb } from "./db.js";

let bucket;

/** Uploaded media is stored inside the database, so it survives server restarts. */
export function getBucket() {
  bucket ||= new GridFSBucket(getDb(), { bucketName: "mediaFiles" });
  return bucket;
}
