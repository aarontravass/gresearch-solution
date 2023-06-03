import streamjson from "stream-json/streamers/StreamArray.js";
import { createReadStream } from "fs";
import { createClient } from "redis";

const client = createClient();

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

async function app() {
  await client.connect().then(() => console.log("connected!"));
  
  const inputJsonPath = "./input.json";

  const pipeline = createReadStream(inputJsonPath).pipe(
    streamjson.withParser()
  );
  console.time("timer");
  let lastobject = null;
  pipeline.on("data", async (chunk) => {
    if (!lastobject) {
      lastobject = chunk.value;
    } else {
      const result = reduce(lastobject, chunk.value);
      lastobject = null;
      client.hSet("session_id", result['session_id'], JSON.stringify(result));
    }
  });

  pipeline.on("close", async () => {
    //console.log(data)
    console.timeEnd("timer");
    await client.quit();
  });
}

app();
