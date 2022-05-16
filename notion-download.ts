import { Client } from "@notionhq/client";
import FileType from "file-type";
import * as Path from "path";
import * as fs from "fs-extra";

import { NotionToMarkdown } from "notion-to-md";
import {
  GetPageResponse,
  ListBlockChildrenResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { RateLimiter } from "limiter";
import fetch from "node-fetch";

const notionLimiter = new RateLimiter({
  tokensPerInterval: 3,
  interval: "second",
});

const notion = new Client({
  auth: process.env.SIL_BLOOM_DOCS_NOTION,
});
const n2m = new NotionToMarkdown({ notionClient: notion });

const kNotionImageDirectoryFromDocusaurusRuntime = "/notion_img";
const kNotionImageDirectory = "./static/notion_img";
async function go() {
  const options = [process.argv[2], process.argv[3]];

  const kOutput = "./docs";

  console.log("Deleting existing markdown...");
  deleteDirectorySync(kOutput);
  fs.mkdirSync(kOutput);
  //deleteDirectory(kNotionImageDirectory);
  if (!fs.pathExistsSync(kNotionImageDirectory))
    fs.mkdirSync(kNotionImageDirectory);

  console.log("Connecting");

  const kIdOfOutlineBlockInNotion = "4e0e73118b8d4f72846fdddca00e2da4";

  await getPagesRecursively(kIdOfOutlineBlockInNotion, kOutput);
}
go().then(() => console.log("finished"));

async function getOnePage(id: string): Promise<GetPageResponse> {
  if (notionLimiter.getTokensRemaining() < 1) {
    console.log("*** delaying for rate limit");
  }
  await notionLimiter.removeTokens(1);

  return await notion.pages.retrieve({
    page_id: id,
  });
}

async function getPagesRecursively(id: string, parentPath: string) {
  const outlinePage = await getOnePage(id);

  // A note on all these `if()` statements. Notion API's GetPageResponse type is union,
  // and Typescript will give type errors unless it sees code that proves that your
  // object is an instance of the union element that you are using.
  if ("properties" in outlinePage) {
    const t = outlinePage.properties.title;
    if ("title" in t && "text" in t.title[0]) {
      const title = t.title[0].text.content;
      console.log(`Reading "${parentPath}/${title}"`);
      const children = await notion.blocks.children.list({
        block_id: id,
        page_size: 100, // max hundred links in a page
      });
      let path = parentPath;
      // don't make a level for "Outline"
      if (title !== "Outline") {
        path = parentPath + "/" + title;
        //console.log("parentPath: " + parentPath);
        //console.log("will mk dir " + path);
        fs.mkdirSync(path);
      }

      for (const b of children.results) {
        if ("child_page" in b) {
          //console.log(JSON.stringify(b, null, 2));
          //console.log("getting one child of " + title);

          await getPagesRecursively(b.id, path);
        } else if ("link_to_page" in b && "page_id" in b.link_to_page) {
          await getContentPage(b.link_to_page.page_id, path);
          //          console.log(JSON.stringify(children, null, 2));
        } else {
          // skipping this block
        }
      }
    }
  }
}

async function getContentPage(id: string, parentPath: string) {
  const contentPage = await getOnePage(id);
  console.log(JSON.stringify(contentPage, null, 2));
  if (!("properties" in contentPage)) {
    throw Error("Expected a properties element on the page");
  }
  if (!("Name" in contentPage.properties)) {
    throw Error("Expected a Name element on the page");
  }
  if (!("title" in contentPage.properties.Name)) {
    throw Error("Expected a properties.Name.title element on the page");
  }
  const title = contentPage.properties.Name.title[0].plain_text;

  const blocks = (await getBlockChildren(id)).results;

  for (const b of blocks) {
    if ("image" in b) {
      let url = "";
      if ("file" in b.image) {
        url = b.image.file.url; // image saved on notion (actually AWS)
      } else {
        url = b.image.external.url; // image still pointing somewhere else. I've see this happen when copying a Google Doc into Notion. Notion kep pointing at the google doc.
      }
      console.log(url);
      /*
      Is the key here the d1058f46-4d2f-4292-8388-4ad393383439? Need to try tuesday.

      aws one for the "marketplace" logo on the "other" md
      https://s3.us-west-2.amazonaws.com/secure.notion-static.com/d1058f46-4d2f-4292-8388-4ad393383439/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220516%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220516T233630Z&X-Amz-Expires=3600&X-Amz-Signature=f215704094fcc884d37073b0b108cf6d1c9da9b7d57a898da38bc30c30b4c4b5&X-Amz-SignedHeaders=host&x-id=GetObject
      from "view original"
      https://s3.us-west-2.amazonaws.com/secure.notion-static.com/d1058f46-4d2f-4292-8388-4ad393383439/Untitled.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAT73L2G45EIPT3X45%2F20220516%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20220516T234003Z&X-Amz-Expires=86400&X-Amz-Signature=cd514b3de76beaf264f3ce36a53a7ece4f00d3df74b2c871cd5120713724d7a4&X-Amz-SignedHeaders=host&response-content-disposition=filename%20%3D%22Untitled.png%22&x-id=GetObject
      */
      //www.notion.so/hattonjohn/How-to-distribute-Bloom-books-on-SD-Cards-861f3795f18a4841804fff2bed0a78bd#69e865397ae846da8141c8ae6bde9056
      const newPath =
        kNotionImageDirectoryFromDocusaurusRuntime +
        "/" +
        (await saveImage(url, kNotionImageDirectory));

      if ("file" in b.image) {
        b.image.file.url = newPath;
      } else {
        b.image.external.url = newPath;
      }
    }
  }

  const mdBlocks = await n2m.blocksToMarkdown(blocks);
  const mdString =
    "---\r\ntitle: ${title}\r\n---\r\n\r\n" + n2m.toMarkdownString(mdBlocks);

  //helpful when debugging changes we make before serializing to markdown
  // fs.writeFileSync(
  //   parentPath + "/" + id + ".json",
  //   JSON.stringify(blocks, null, 2)
  // );

  fs.writeFileSync(parentPath + "/" + id + ".md", mdString);
}

/**
 * Remove directory recursively
 * @see https://stackoverflow.com/a/42505874/3027390
 */
function deleteDirectorySync(directory: string) {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach((entry) => {
      const entryPath = Path.join(directory, entry);
      if (fs.lstatSync(entryPath).isDirectory()) {
        deleteDirectorySync(entryPath);
      } else {
        fs.unlinkSync(entryPath);
      }
    });
    fs.rmdirSync(directory);
  }
}

async function getBlockChildren(
  block_id: string
): Promise<ListBlockChildrenResponse> {
  // we can only get so many responses per call, so we set this to
  // the first response we get, then keep adding to its array of blocks
  // with each subsequent response
  let overallResult: ListBlockChildrenResponse | undefined = undefined;
  let pageCount = 0;
  let start_cursor = undefined;

  do {
    if (notionLimiter.getTokensRemaining() < 1) {
      console.log("*** delaying for rate limit");
    }
    await notionLimiter.removeTokens(1);

    const response: ListBlockChildrenResponse =
      await notion.blocks.children.list({
        start_cursor: start_cursor,
        block_id: block_id,
      });
    if (!overallResult) {
      overallResult = response!;
    } else {
      overallResult.results.push(...response.results);
    }

    start_cursor = response?.next_cursor;
    pageCount += 1;
  } while (start_cursor != null);
  return overallResult!;
}

// function uuid() {
//   const url = URL.createObjectURL(new Blob());
//   const [id] = url.toString().split("/").reverse();
//   URL.revokeObjectURL(url);
//   return id;
// }

async function saveImage(
  url: string,
  imageFolderPath: string
): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileType = await FileType.fromBuffer(buffer);
  if (fileType?.ext) {
    // too hard to figure out the original file name, if there was one, so make a hash of the url
    const hash = hashOfString(url);
    const outputFileName = `${hash}.${fileType.ext}`;
    const path = imageFolderPath + "/" + outputFileName;
    if (!fs.pathExistsSync(path)) {
      // // I think that this ok that this is writing async as we continue
      console.log("Adding image " + path);
      fs.createWriteStream(path).write(buffer);
    } else {
      console.log("Already have image " + path);
    }
    return outputFileName;
  } else {
    console.error(
      `Something wrong with the filetype extension on the blob we got from ${url}`
    );
    return "error";
  }
}
function hashOfString(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; ++i)
    hash = Math.imul(31, hash) + s.charCodeAt(i);

  return Math.abs(hash);
}
