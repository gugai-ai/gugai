import { detectIntent } from "./intent";

const tests = [
  "Create AI videos",
  "Remove background from 500 product images",
  "Edit my product images",
  "Create an AI image for my website",
  "Convert my podcast audio into text",
  "Turn this article into a voiceover",
  "Remove background and edit my product images",
  "Turn my podcast into a video",
  "I need an AI tool",
];

for (const query of tests) {
  console.log("\nQUERY:", query);
  console.log(JSON.stringify(detectIntent(query), null, 2));
}