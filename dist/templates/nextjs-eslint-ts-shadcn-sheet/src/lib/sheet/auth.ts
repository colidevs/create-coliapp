import {google} from "googleapis";

import {config} from "./config";

const scopes = ["https://www.googleapis.com/auth/spreadsheets"];

//TODO: Load credentials from external storage
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: config.gcp.credentials.PROJECT_ID,
    private_key_id: config.gcp.credentials.KEY_ID,
    private_key: config.gcp.credentials.KEY,
    client_email: config.gcp.credentials.CLIENT_EMAIL,
    client_id: config.gcp.credentials.CLIENT_ID,
    universe_domain: "googleapis.com",
  },
  scopes,
});

export const sheets = google.sheets({version: "v4", auth});
