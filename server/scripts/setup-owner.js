import "dotenv/config";
import bcrypt from "bcryptjs";
import {MongoClient} from "mongodb";
const email=String(process.env.OWNER_EMAIL||"").trim().toLowerCase();
const password=String(process.env.OWNER_PASSWORD||"");
if(!email||password.length<12) throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD (at least 12 characters) in .env");
const client=new MongoClient(process.env.MONGODB_URI||"mongodb://127.0.0.1:27017");
await client.connect();
try{
 const users=client.db(process.env.MONGODB_DB||"signcms_dev").collection("users");
 await users.createIndex({email:1},{unique:true});
 if(await users.findOne({role:"owner"})) throw new Error("An owner already exists; setup will not overwrite it.");
 if(await users.findOne({email})) throw new Error("That email already exists.");
 await users.insertOne({email,name:"SignCMS Owner",role:"owner",passwordHash:await bcrypt.hash(password,12),createdAt:new Date()});
 console.log(`Owner created: ${email}`);
}finally{await client.close();}
