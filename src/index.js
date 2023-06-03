import streamjson from "stream-json/streamers/StreamArray.js";
import { createReadStream } from "fs";
import { createWriteStream } from "fs";

const outputJsonPath = "./reduced_output.json";

// this writer function creates a write stream to the output JSON
function Writer() {
  this.writeStream = createWriteStream(outputJsonPath, {
    encoding: "utf-8",
    flags: "a", // the flag 'a' means the data should be appended
  });
  this._write = (chunk) => {
    this.writeStream.write(chunk);
  };
  this._close = () => {
    this.writeStream.close();
  };
}
// the reduce function takes a start and end object and creates a single object 
const reduce = (start_object, end_object) => {
  const result = {};
  result["session_id"] = start_object.id;
  result["start_time"] = start_object.timestamp;
  result["end_time"] = end_object.timestamp;
  result["duration"] =
    parseInt(end_object.timestamp) - parseInt(start_object.timestamp) + "s";
  result["late"] =
    (parseInt(end_object.timestamp) - parseInt(start_object.timestamp)) / 3600 >
    24;
  result["damaged"] = Boolean(end_object.comments).valueOf();
  return result;
};
// main app function
function app() {
  const inputJsonPath = "./input.json";

  // the read stream creates a stream of json data from the input path
  const pipeline = createReadStream(inputJsonPath).pipe(
    streamjson.withParser()
  );
  const writer = new Writer();
  // the time function in console is used for timing purposes
  console.time("timer_2");
  let lastobject = null;
  // the event 'data' means whenever a chunk of json is read, it will pass this chunk to the call back function
  pipeline.on("data", (chunk) => {
    if (!lastobject) {
      lastobject = chunk.value;
    } else {
      const result = reduce(lastobject, chunk.value);
      lastobject = null;
      writer._write(JSON.stringify(result) + ",\n");
    }
  });

  pipeline.on("close", () => {
    //console.log(data)
    console.timeEnd("timer_2");
    const used = process.memoryUsage();
    for (let key in used) {
      console.log(
        `${key} ${Math.round((used[key] / 1024 / 1024) * 100) / 100} MB`
      );
    }
    writer._close();
  });
}
app();
