import { createWriteStream } from "fs";
import { randomBytes, randomInt } from "crypto";
import {config} from "dotenv";
config();
const rows = parseInt(process.env.NUMBER_OF_RECORDS || '100');
console.log("No of rows to generate: ", rows)
const filename = "./input.json";
let has_comments = true;
function GenerateData() {
  const id = randomBytes(10).toString("hex");
  const start_timestamp = Math.round(new Date().valueOf() / 1000);
  const end_timestamp = start_timestamp + randomInt(100, 100000);
  const comments = has_comments ? id : "";
  const start = {
    type: "START",
    id,
    timestamp: start_timestamp.toString(),
    comments: "",
  };
  const end = {
    type: "END",
    id,
    timestamp: end_timestamp.toString(),
    comments,
  };
  has_comments = !has_comments;
  return {
    start,
    end,
  };
}

function write() {
  const stream = createWriteStream(filename, { flags: "a", encoding: "utf-8" });
  for (let i = 0; i < rows; i++) {
    if(i%100000==0){
      console.log("Wrote ", i, " rows");
    }
    let str = "";
    if (i == 0) {
      str += "[\n";
    } else if (i >= rows - 1) {
      str += "]";
    } else {
      const { start, end } = GenerateData();
      str += JSON.stringify(start) + ",\n";
      str += JSON.stringify(end) + (i == rows - 2 ? "" : ",") + "\n";
    }
    stream.write(str);
  }
  stream.close();
}

write();
