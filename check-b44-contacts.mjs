import { createClient } from "@base44/sdk";

const BASE44_APP_ID  = "697255032d967aa9ffcaa1f8";
const BASE44_API_KEY = "af1c5cdf479a467abd9d924d3f395850";
const BASE44_PLATFORM_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb3Z5OTZAZ21haWwuY29tIiwiZXhwIjoxNzc5OTcxMDYyLCJpYXQiOjE3NzczNzkwNjIsImF1ZCI6InBsYXRmb3JtIn0.JHYPP98-n7jx4S7qdUje0Q5Fg2W8rN7gfTnvP0S0Rb4";

const appTokenResp = await fetch(`https://base44.app/api/apps/${BASE44_APP_ID}/auth/token`, { headers: { Authorization: `Bearer ${BASE44_PLATFORM_TOKEN}` } });
const { token: appToken } = await appTokenResp.json();
const base44 = createClient({ appId: BASE44_APP_ID, apiKey: BASE44_API_KEY, token: appToken, serviceToken: appToken });

const pcs = await base44.asServiceRole.entities.ProjectContact.list();
console.log(`ProjectContacts: ${pcs.length}`);
if (pcs.length > 0) {
  console.log("\n=== PROJECTCONTACT FIELDS ===");
  console.log(Object.keys(pcs[0]).join(", "));
  pcs.forEach(r => {
    console.log("\n---");
    Object.entries(r).forEach(([k,v]) => v !== null && v !== undefined && v !== false && v !== "" && console.log(`  ${k}: ${JSON.stringify(v)}`));
  });
}
