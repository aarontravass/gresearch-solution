# G-Research Challenege Solution
## Approach
The naive solution is fairly simple: Read the json file, assemble the resulting json in memory and output it to a file. I instead chose to tackle the large file challenge. This required reading a very large JSON and concurrently writing it to either a file or an in memory database.

I decided to use NodeJS to write my solution. NodeJS has a feature called streams that stream chunks of data and these chunks can be modified when held in memory. 

To package the application, I used docker. I also set up a Kubernetes deployment yml file but since I did not have access to a Kubernetes cluster, I have commented out the `kubectl set` job. 

For building and running, a github actions workflow file has been set up. 

I also had to prove that the heap usage for a given `input.json` file is independent of the number of rows of JSON and for that I set up profilling. Experimentation was done to prove the relationship between heap and number of rows was independent. 

I also created a script that would output the rows to a redis instance (docker compose) but unfortunately the nodejs script would [terminate due to memory issues](https://github.com/aarontravass/gresearch-solution/actions/runs/5162402075/jobs/9300074439#step:8:1) for `10000000` rows of JSON. Github actions ubuntu runner has only 7GB of memory available and when I tried to use [large runners with more memory](https://docs.github.com/en/actions/using-github-hosted-runners/using-larger-runners) the job [didn't get picked up](https://github.com/aarontravass/gresearch-solution/actions/runs/5162364007) since large runners are only available for enterprise users. I would expect the redis script to be at least 40-50% faster.

## Implementation
[NodeJS streams](https://nodejs.org/api/stream.html) are a convenient way to work with streams of data since they do not depend upon the amount of data. The data can be manipulated on the go. By creating a file stream, the file can be arbitrarily large and there would little to no memory footprint. NodeJS streams are also buffered. This prevents excessive file system calls. Once the buffer is full, Nodejs automatically flushes the buffer.

Each line in a file is read as a chunk of data and this needs to be assembled into something meaningful. I opted to use the npm module [`stream-json`](https://github.com/uhop/stream-json) and it contains a convenient module called `StreamArray` that converts a JSON array file into JSON chunks. The original file stream is piped through this `StreamArray` module which assembles chunks into meaningful data. I then collected 2 contiguous chunks and passed them into a reducer function called `reduce` that would give the required output JSON. This reduced chunk is then streamed back into an output json file.

This simple solution has a few assumptions

1. A unique session always shows up in pairs i.e. `START` and `END`
2. These pairs are always ordered by the time they arrive i.e. `END` will always come immediately after `START`
3. I assume the timestamp for both is correctly ordered.

A `Dockerfile` has been set up to containerize the code and the image is available at `ghcr.io/aarontravass/stream-reducer/app`.

Since the available number of rows were not significant enough to produce evidence of independent memory usage, I wrote a generator script that generates rows of JSON given an input. The generator script uses the `randomBytes` function from the  `crypto` module in nodejs to generate Pseudo Random hexadecimal strings. This ensures that our generator is non blocking which happens in case of a True Random Number Generator. 

To test my code, a [github actions workflow has been set up](https://github.com/aarontravass/gresearch-solution/actions). Some jobs have been commented out due to infrastructure limitations.

## Experimentation
In order to measure the memory performance, I used data from [`process.memoryUsage()`](https://nodejs.org/api/process.html#processmemoryusage). In particular, the `heapUsed` parameter is the main value that we need to track since it shows the amount of memory used by variables in the heap.

To prove my code did indeed work, I tested my script against different inputs. The table and graph is below. I ran this on Github codespace machine which had specs of [2 core, 8 GB RAM and 32 GB SSD storage](https://docs.github.com/en/codespaces/overview#what-is-a-codespace).

| Number of Rows | Memory Usage (MegaBytes) |
| --- | ----------- |
| 1000 |	5.24 |
| 10000 |	8.13 |
| 100000 |	15.43 |
| 1000000 |	10.72 |

At 1000000 rows, the generated json file size is 177,999,872 bytes or 177MB.


A visualization of the above table is shown below

![Graph of Number of Rows processed vs Memory Usage!](/assets/graph.png)

The graph shows memory usage is minimal and not dependent on input.

## Future Work
### Challenges involved
1. I spent a significant amount of time researching the best way to handle large data. Blogs and Stackoverflow were particularly helpful.
2. The rest of my time was spent juggling between runing the code on my local windows machine and the linux codespace since windows notoriously tends to have memory issues. It becomes worse when docker is used which hampers my productivity.

### Comments
* This challenges was very interesting. I decided to approach this from an infrastructural point of view. Hence I set up NodeJS streams, kubernetes, docker and redis. 
* I would love to test my solution with very large JSON files (on the order of GBs or TBs) to see how my script would perform
* `src/index.js` is the main file which processes the data.
* `generator/generator.js` is the file which generates a json file
* `manifest/stream-reducer.yml` is the K8 manifest file
* the JSON provided in the pdf seemed to be incorrect. Hence I modified it and saved it under `correct_json.json`
* I noticed that the time taken to process is nearly 4 minutes for a million rows. This time can be reduced if the set up is distributed as 2 worker pods that listen to the stream and process the data.