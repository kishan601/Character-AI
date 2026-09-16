const { execSync } = require('child_process');
const fs = require('fs');

const startDate = new Date('2026-07-01T00:00:00Z').getTime();
const endDate = new Date('2026-09-15T00:00:00Z').getTime();

const randomDate = () => {
  return new Date(startDate + Math.random() * (endDate - startDate));
};

// Generate 29 random dates and sort them so the git history stays chronological
const dates = [];
for (let i = 0; i < 29; i++) {
  dates.push(randomDate());
}
dates.sort((a, b) => a.getTime() - b.getTime());

console.log("Generating 29 backdated commits...");

for (let i = 0; i < 29; i++) {
  const dateStr = dates[i].toISOString();
  
  // Modify a dummy file to ensure there's a diff to commit
  fs.appendFileSync('activity.txt', `Activity log ${i + 1} on ${dateStr}\n`);
  
  execSync('git add activity.txt');
  
  // Run git commit with overridden dates
  execSync(`git commit -m "chore: update activity tracking metrics"`, {
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: dateStr,
      GIT_COMMITTER_DATE: dateStr,
    }
  });
  console.log(`Created commit [${i + 1}/29] backdated to ${dateStr}`);
}

console.log("Done! You can run 'git push' to push these commits to GitHub.");
