import { createClient } from "@base44/sdk";

const BASE44_APP_ID  = "697255032d967aa9ffcaa1f8";
const BASE44_API_KEY = "af1c5cdf479a467abd9d924d3f395850";
const BASE44_PLATFORM_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjb3Z5OTZAZ21haWwuY29tIiwiZXhwIjoxNzc5OTcxMDYyLCJpYXQiOjE3NzczNzkwNjIsImF1ZCI6InBsYXRmb3JtIn0.JHYPP98-n7jx4S7qdUje0Q5Fg2W8rN7gfTnvP0S0Rb4";

const appTokenResp = await fetch(
  `https://base44.app/api/apps/${BASE44_APP_ID}/auth/token`,
  { headers: { Authorization: `Bearer ${BASE44_PLATFORM_TOKEN}` } }
);
if (!appTokenResp.ok) { console.error("Token failed:", await appTokenResp.text()); process.exit(1); }
const { token: appToken } = await appTokenResp.json();
console.log("App token obtained:", appToken ? "yes" : "no");

const base44 = createClient({ appId: BASE44_APP_ID, apiKey: BASE44_API_KEY, token: appToken, serviceToken: appToken });

// Get tasks
const tasks = await base44.asServiceRole.entities.Task.list();
console.log(`\nTasks: ${tasks.length}`);
if (tasks.length > 0) {
  console.log("\n=== TASK FIELDS ===");
  console.log(Object.keys(tasks[0]).join(", "));
  // Show first task with all values
  const sample = tasks.find(t => Object.values(t).some(v => v && typeof v === 'string' && v.length > 2)) || tasks[0];
  console.log("\nSample task:");
  Object.entries(sample).forEach(([k,v]) => v !== null && v !== undefined && console.log(`  ${k}: ${JSON.stringify(v)}`));
}

// Get projects
const projects = await base44.asServiceRole.entities.Project.list();
console.log(`\nProjects: ${projects.length}`);
if (projects.length > 0) {
  console.log("\n=== PROJECT FIELDS ===");
  console.log(Object.keys(projects[0]).join(", "));
  // Show project with non-empty arrays
  const withData = projects.find(p => Object.values(p).some(v => Array.isArray(v) && v.length > 0));
  if (withData) {
    console.log("\nProject with data:");
    Object.entries(withData).forEach(([k,v]) => v !== null && v !== undefined && v !== false && console.log(`  ${k}: ${JSON.stringify(v)}`));
  }
}
