const sessionId = "cmubgffbx000eupn0img4yq25";
const messageId = "cmuck9u4a0007upyk0zuuwhtk";

const aiConfig = {
  aiModel: "nvidia/nemotron-3-nano-4b",
  aiContextLimit: 4096,
  aiEndpoint: "http://192.168.29.240:1234/v1/chat/completions"
};

fetch("http://localhost:3001/api/generate/regenerate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-ai-config": JSON.stringify(aiConfig)
  },
  body: JSON.stringify({ sessionId, messageId })
}).then(async r => {
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  while(true) {
    const {done, value} = await reader.read();
    if(done) break;
    process.stdout.write(decoder.decode(value));
  }
}).catch(console.error);
