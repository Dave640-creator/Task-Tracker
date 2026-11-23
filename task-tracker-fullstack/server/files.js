// Uploaded files are saved in a private Supabase Storage bucket.
import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";

let client;
function storage() {
  if (!client) {
    if (!config.supabaseUrl || !config.supabaseKey) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set");
    client = createClient(config.supabaseUrl, config.supabaseKey, { auth: { persistSession: false } });
  }
  return client.storage.from(config.bucket);
}

export async function saveFile(storedName, buffer, contentType) {
  const { error } = await storage().upload(storedName, buffer, { contentType: contentType || "application/octet-stream" });
  if (error) throw new Error("Could not save the file: " + error.message);
}

export async function readFile(storedName) {
  const { data, error } = await storage().download(storedName);
  if (error) throw new Error("Could not read the file: " + error.message);
  return Buffer.from(await data.arrayBuffer());
}

// Never throws: a missing file should not break deleting a task
export async function removeFiles(storedNames) {
  if (storedNames.length === 0) return;
  try {
    await storage().remove(storedNames);
  } catch (err) {
    console.error("Could not remove files", err);
  }
}
