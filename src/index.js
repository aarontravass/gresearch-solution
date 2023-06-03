import streamjson from "stream-json/streamers/StreamArray.js";
import { createReadStream } from "fs";
import { createWriteStream } from "fs";

const outputJsonPath = "./reduced_output.json";

function Writer() {
  this.writeStream = createWriteStream(outputJsonPath, {
    encoding: "utf-8",
    flags: "a",
  });
  this._write = (chunk) => {
    this.writeStream.write(chunk);
  };
  this._close = () => {
    this.writeStream.close();
  };
}

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

function app() {
  const inputJsonPath = "./input.json";

  const pipeline = createReadStream(inputJsonPath).pipe(
    streamjson.withParser()
  );
  const writer = new Writer();
  console.time("timer_2");
  let lastobject = null;
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
    writer._close();
  });
}
app();
