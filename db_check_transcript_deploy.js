import fs from 'fs';
import readline from 'readline';

const logPath = 'C:\\Users\\Itsme\\.gemini\\antigravity-ide\\brain\\0bdb7dbe-cda4-4049-96bf-0fccabe7168b\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log("Searching transcript for 'deploy' commands...");
  
  for await (const line of rl) {
    if (line.includes("functions deploy") || line.includes("project-ref") || line.includes("supabase functions")) {
      const parsed = JSON.parse(line);
      console.log(`Step: ${parsed.step_index}, Source: ${parsed.source}`);
      if (parsed.content) {
        console.log(`Content: ${parsed.content}`);
      }
      if (parsed.tool_calls) {
        console.log(`Tool Calls: ${JSON.stringify(parsed.tool_calls)}`);
      }
      console.log("-----------------------------------------");
    }
  }
}

run().catch(console.error);
